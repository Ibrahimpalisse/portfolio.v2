import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { hasAdminMfaSatisfied, verifyAdminTotpCode } from "@/lib/admin/mfa";
import { parseAdminMfaVerifyBody } from "@/lib/admin/mfa-schema";
import { jsonResponse } from "@/lib/api/json-response";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_LOGIN_LIMITS } from "@/lib/admin/constants";

const GENERIC_MFA_ERROR = "Code invalide ou expiré. Réessayez.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return jsonResponse({ error: "Service temporairement indisponible." }, 503);
  }

  if (!verifyFormRequestOrigin(request)) {
    logAdminAuthEvent("mfa_failed", ip, { reason: "origin" });
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

  const parsed = parseAdminMfaVerifyBody(parsedBody.body);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAllowedAdminEmail(user.email)) {
      logAdminAuthEvent("mfa_failed", ip, { reason: "no_session" });
      return jsonResponse({ error: "Session expirée. Reconnectez-vous." }, 401);
    }

    const { error } = await verifyAdminTotpCode(supabase, parsed.data);

    if (error) {
      logAdminAuthEvent("mfa_failed", ip);
      return jsonResponse({ error: GENERIC_MFA_ERROR }, 401);
    }

    const mfaOk = await hasAdminMfaSatisfied(supabase);
    if (!mfaOk) {
      logAdminAuthEvent("mfa_failed", ip, { reason: "aal" });
      return jsonResponse({ error: GENERIC_MFA_ERROR }, 401);
    }

    logAdminAuthEvent("mfa_success", ip);
    logAdminAuthEvent("login_success", ip);
    return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.home }, 200);
  } catch {
    logAdminAuthEvent("mfa_failed", ip, { reason: "exception" });
    return jsonResponse({ error: "Vérification impossible pour le moment." }, 502);
  }
}

export function GET() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
