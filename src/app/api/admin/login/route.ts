import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { parseAdminLoginBody } from "@/lib/admin/login-schema";
import {
  adminHasVerifiedTotp,
  adminMfaRequired,
  hasAdminMfaSatisfied,
  startAdminMfaChallenge,
} from "@/lib/admin/mfa";
import { jsonResponse } from "@/lib/api/json-response";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { getClientIp } from "@/lib/rate-limit-core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ADMIN_LOGIN_LIMITS } from "@/lib/admin/constants";

const GENERIC_LOGIN_ERROR = "Identifiants invalides ou accès refusé.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return jsonResponse({ error: "Service temporairement indisponible." }, 503);
  }

  if (!verifyFormRequestOrigin(request)) {
    logAdminAuthEvent("login_failed", ip, { reason: "origin" });
    return jsonResponse({ error: "Requête non autorisée." }, 403);
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return jsonResponse({ error: "Requête invalide." }, 415);
  }

  const parsedBody = await parseJsonBody(request, ADMIN_LOGIN_LIMITS.maxBodyBytes);
  if (!parsedBody.ok) {
    return jsonResponse({ error: "Requête invalide." }, 400);
  }

  const parsed = parseAdminLoginBody(parsedBody.body);
  if (!parsed.ok) {
    if (parsed.error === "honeypot") {
      return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.home }, 200);
    }
    return jsonResponse({ error: parsed.error }, 400);
  }

  const { email, password } = parsed.data;

  if (!isAllowedAdminEmail(email)) {
    logAdminAuthEvent("login_blocked_allowlist", ip);
    return jsonResponse({ error: GENERIC_LOGIN_ERROR }, 401);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      logAdminAuthEvent("login_failed", ip);
      return jsonResponse({ error: GENERIC_LOGIN_ERROR }, 401);
    }

    if (!isAllowedAdminEmail(data.user.email)) {
      await supabase.auth.signOut();
      logAdminAuthEvent("login_blocked_allowlist", ip);
      return jsonResponse({ error: GENERIC_LOGIN_ERROR }, 403);
    }

    const hasTotp = await adminHasVerifiedTotp(supabase);
    if (!hasTotp) {
      await supabase.auth.signOut();
      logAdminAuthEvent("login_failed", ip, { reason: "no_totp" });
      return jsonResponse(
        {
          error:
            "Authentification TOTP requise. Enrôlez un facteur dans Supabase (Authentication → MFA).",
        },
        403
      );
    }

    const needsMfa = await adminMfaRequired(supabase);
    if (needsMfa) {
      const challenge = await startAdminMfaChallenge(supabase);
      if (!challenge.ok) {
        await supabase.auth.signOut();
        logAdminAuthEvent("mfa_failed", ip, { reason: challenge.error });
        return jsonResponse({ error: GENERIC_LOGIN_ERROR }, 401);
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

    const mfaOk = await hasAdminMfaSatisfied(supabase);
    if (!mfaOk) {
      await supabase.auth.signOut();
      logAdminAuthEvent("login_failed", ip, { reason: "aal" });
      return jsonResponse({ error: GENERIC_LOGIN_ERROR }, 401);
    }

    logAdminAuthEvent("login_success", ip);
    return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.home }, 200);
  } catch {
    logAdminAuthEvent("login_failed", ip, { reason: "exception" });
    return jsonResponse({ error: "Connexion impossible pour le moment." }, 502);
  }
}

export function GET() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
