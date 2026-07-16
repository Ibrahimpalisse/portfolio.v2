import {
  clearAdminLoginFailures,
  isAdminAccountLocked,
  recordAdminLoginFailure,
} from "@/lib/admin/account-lockout";
import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ROUTES, ADMIN_LOGIN_LIMITS } from "@/lib/admin/constants";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { parseAdminLoginBody } from "@/lib/admin/login-schema";
import {
  adminHasVerifiedTotp,
  adminMfaRequired,
  hasAdminMfaSatisfied,
  startAdminMfaChallenge,
} from "@/lib/admin/mfa";
import { jsonResponse } from "@/lib/api/json-response";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { getTurnstileGuardFailure } from "@/lib/security/production-guards";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { getClientIp } from "@/lib/rate-limit-core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  const turnstileGuard = getTurnstileGuardFailure();
  if (turnstileGuard === "missing_config") {
    console.error("[admin-auth] Turnstile requis en production mais non configuré");
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  if (!verifyFormRequestOrigin(request)) {
    logAdminAuthEvent("login_failed", ip, { reason: "origin" });
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAUTHORIZED_ORIGIN, 403);
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CONTENT_TYPE, 415);
  }

  const parsedBody = await parseJsonBody(request, ADMIN_LOGIN_LIMITS.maxBodyBytes);
  if (!parsedBody.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const parsed = parseAdminLoginBody(parsedBody.body);
  if (!parsed.ok) {
    if (parsed.error === "honeypot") {
      return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.home }, 200);
    }
    return jsonResponse({ error: parsed.error, code: ADMIN_ERROR_CODES.INVALID_REQUEST }, 400);
  }

  if (isTurnstileEnabled()) {
    const valid = await verifyTurnstileToken(parsed.data.turnstileToken, ip);
    if (!valid) {
      logAdminAuthEvent("login_failed", ip, { reason: "turnstile" });
      return adminErrorResponse(ADMIN_ERROR_CODES.TURNSTILE_FAILED, 400);
    }
  }

  const { email, password } = parsed.data;

  const lock = isAdminAccountLocked(email);
  if (lock.locked) {
    logAdminAuthEvent("login_rate_limited", ip, { reason: "account_lock" });
    return adminErrorResponse(ADMIN_ERROR_CODES.ACCOUNT_LOCKED, 429, {
      ...(lock.retryAfterSec ? { "Retry-After": String(lock.retryAfterSec) } : {}),
    });
  }

  if (!isAllowedAdminEmail(email)) {
    logAdminAuthEvent("login_blocked_allowlist", ip);
    // Réponse générique (pas d'énumération d'emails).
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CREDENTIALS, 401);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      const failure = recordAdminLoginFailure(email);
      logAdminAuthEvent("login_failed", ip, {
        locked: failure.locked,
      });
      if (failure.locked) {
        return adminErrorResponse(ADMIN_ERROR_CODES.ACCOUNT_LOCKED, 429, {
          ...(failure.retryAfterSec
            ? { "Retry-After": String(failure.retryAfterSec) }
            : {}),
        });
      }
      return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CREDENTIALS, 401);
    }

    if (!isAllowedAdminEmail(data.user.email)) {
      await supabase.auth.signOut({ scope: "local" });
      logAdminAuthEvent("login_blocked_allowlist", ip);
      return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CREDENTIALS, 403);
    }

    clearAdminLoginFailures(email);

    const hasTotp = await adminHasVerifiedTotp(supabase);
    if (!hasTotp) {
      logAdminAuthEvent("mfa_enroll_started", ip);
      return jsonResponse({ ok: true, mfaEnrollmentRequired: true }, 200);
    }

    const needsMfa = await adminMfaRequired(supabase);
    if (needsMfa) {
      const challenge = await startAdminMfaChallenge(supabase);
      if (!challenge.ok) {
        await supabase.auth.signOut({ scope: "local" });
        logAdminAuthEvent("mfa_failed", ip, { reason: challenge.error });
        return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CREDENTIALS, 401);
      }

      logAdminAuthEvent("mfa_challenge", ip);
      return jsonResponse(
        {
          ok: true,
          mfaRequired: true,
          factorId: challenge.data.factorId,
          challengeId: challenge.data.challengeId,
        },
        200
      );
    }

    const mfaOk = await hasAdminMfaSatisfied(supabase, data.user);
    if (!mfaOk) {
      await supabase.auth.signOut({ scope: "local" });
      logAdminAuthEvent("login_failed", ip, { reason: "aal" });
      return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CREDENTIALS, 401);
    }

    logAdminAuthEvent("login_success", ip);
    return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.home }, 200);
  } catch {
    logAdminAuthEvent("login_failed", ip, { reason: "exception" });
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }
}

export function GET() {
  return adminMethodNotAllowed();
}
