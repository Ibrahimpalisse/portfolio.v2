import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import {
  ADMIN_PASSWORD_CHANGE_LIMITS,
  ADMIN_ROUTES,
} from "@/lib/admin/constants";
import { ADMIN_ERROR_CODES, type AdminErrorCode } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { hasAdminMfaSatisfied } from "@/lib/admin/mfa";
import { parseAdminPasswordChangeBody } from "@/lib/admin/password-change-schema";
import { jsonResponse } from "@/lib/api/json-response";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseEphemeralClient } from "@/lib/supabase/ephemeral";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function mapUpdatePasswordCode(message: string | undefined): AdminErrorCode {
  const lower = (message ?? "").toLowerCase();

  if (lower.includes("same") || lower.includes("different")) {
    return ADMIN_ERROR_CODES.PASSWORD_SAME;
  }
  if (lower.includes("weak") || lower.includes("pwned") || lower.includes("leaked")) {
    return ADMIN_ERROR_CODES.PASSWORD_WEAK;
  }
  if (lower.includes("aal") || lower.includes("mfa") || lower.includes("factor")) {
    return ADMIN_ERROR_CODES.MFA_REQUIRED;
  }
  if (lower.includes("session missing") || lower.includes("not authenticated")) {
    return ADMIN_ERROR_CODES.SESSION_EXPIRED;
  }

  return ADMIN_ERROR_CODES.PASSWORD_UPDATE_FAILED;
}

/**
 * OWASP :
 * - Ré-auth du mot de passe actuel (client éphémère, sans toucher la session MFA)
 * - Session AAL2 obligatoire pour updateUser
 * - Origin / honeypot / rate-limit
 * - Invalidation globale des sessions après succès
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  if (!verifyFormRequestOrigin(request)) {
    logAdminAuthEvent("password_change_failed", ip, { reason: "origin" });
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAUTHORIZED_ORIGIN, 403);
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CONTENT_TYPE, 415);
  }

  const parsedBody = await parseJsonBody(
    request,
    ADMIN_PASSWORD_CHANGE_LIMITS.maxBodyBytes
  );
  if (!parsedBody.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const parsed = parseAdminPasswordChangeBody(parsedBody.body);
  if (!parsed.ok) {
    if (parsed.error === "honeypot") {
      return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.login }, 200);
    }
    return jsonResponse(
      { error: parsed.error, code: ADMIN_ERROR_CODES.INVALID_REQUEST },
      400
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email || !isAllowedAdminEmail(user.email)) {
      logAdminAuthEvent("password_change_failed", ip, { reason: "no_session" });
      return adminErrorResponse(ADMIN_ERROR_CODES.SESSION_EXPIRED, 401);
    }

    if (!(await hasAdminMfaSatisfied(supabase, user))) {
      logAdminAuthEvent("password_change_failed", ip, { reason: "aal" });
      return adminErrorResponse(ADMIN_ERROR_CODES.MFA_REQUIRED, 403);
    }

    const ephemeral = createSupabaseEphemeralClient();
    const { data: reauthData, error: reauthError } =
      await ephemeral.auth.signInWithPassword({
        email: user.email,
        password: parsed.data.currentPassword,
      });

    if (reauthError || !reauthData.user) {
      logAdminAuthEvent("password_change_failed", ip, { reason: "reauth" });
      return adminErrorResponse(ADMIN_ERROR_CODES.PASSWORD_REAUTH_FAILED, 401);
    }

    if (reauthData.user.id !== user.id) {
      logAdminAuthEvent("password_change_failed", ip, { reason: "user_mismatch" });
      return adminErrorResponse(ADMIN_ERROR_CODES.PASSWORD_REAUTH_FAILED, 401);
    }

    // signOut() défaut = global → révoquerait la session MFA cookie.
    await ephemeral.auth.signOut({ scope: "local" }).catch(() => null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      const code = mapUpdatePasswordCode(updateError.message);
      logAdminAuthEvent("password_change_failed", ip, {
        reason: "update",
        code: updateError.code ?? "unknown",
        detail: (updateError.message ?? "unknown").slice(0, 120),
      });
      return adminErrorResponse(code, 400);
    }

    await supabase.auth.signOut({ scope: "global" });

    logAdminAuthEvent("password_change_success", ip);
    return jsonResponse(
      {
        ok: true,
        redirectTo: ADMIN_ROUTES.login,
        message: "Mot de passe mis à jour. Reconnectez-vous.",
      },
      200
    );
  } catch {
    logAdminAuthEvent("password_change_failed", ip, { reason: "exception" });
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }
}

export function GET() {
  return adminMethodNotAllowed();
}
