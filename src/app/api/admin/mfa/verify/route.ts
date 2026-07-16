import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_LOGIN_LIMITS, ADMIN_ROUTES } from "@/lib/admin/constants";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { hasAdminMfaSatisfied, verifyAdminTotpCode } from "@/lib/admin/mfa";
import { parseAdminMfaVerifyBody } from "@/lib/admin/mfa-schema";
import { jsonResponse } from "@/lib/api/json-response";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  if (!verifyFormRequestOrigin(request)) {
    logAdminAuthEvent("mfa_failed", ip, { reason: "origin" });
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

  const parsed = parseAdminMfaVerifyBody(parsedBody.body);
  if (!parsed.ok) {
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

    if (!user || !isAllowedAdminEmail(user.email)) {
      logAdminAuthEvent("mfa_failed", ip, { reason: "no_session" });
      return adminErrorResponse(ADMIN_ERROR_CODES.SESSION_EXPIRED, 401);
    }

    const { error } = await verifyAdminTotpCode(supabase, parsed.data);

    if (error) {
      logAdminAuthEvent("mfa_failed", ip);
      return adminErrorResponse(ADMIN_ERROR_CODES.MFA_INVALID, 401);
    }

    const mfaOk = await hasAdminMfaSatisfied(supabase, user);
    if (!mfaOk) {
      logAdminAuthEvent("mfa_failed", ip, { reason: "aal" });
      return adminErrorResponse(ADMIN_ERROR_CODES.MFA_INVALID, 401);
    }

    logAdminAuthEvent("mfa_success", ip);
    logAdminAuthEvent("login_success", ip);
    return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.home }, 200);
  } catch {
    logAdminAuthEvent("mfa_failed", ip, { reason: "exception" });
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }
}

export function GET() {
  return adminMethodNotAllowed();
}
