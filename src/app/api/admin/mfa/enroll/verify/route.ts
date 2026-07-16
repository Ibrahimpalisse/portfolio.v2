import { z } from "zod";
import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_LOGIN_LIMITS, ADMIN_ROUTES } from "@/lib/admin/constants";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { confirmAdminMfaEnrollment, hasAdminMfaSatisfied } from "@/lib/admin/mfa";
import { jsonResponse } from "@/lib/api/json-response";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const enrollVerifySchema = z.object({
  factorId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Entrez le code à 6 chiffres de votre application."),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  if (!verifyFormRequestOrigin(request)) {
    logAdminAuthEvent("mfa_enroll_failed", ip, { reason: "origin" });
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

  const parsed = enrollVerifySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonResponse(
      {
        error: parsed.error.issues[0]?.message ?? "Requête invalide.",
        code: ADMIN_ERROR_CODES.INVALID_REQUEST,
      },
      400
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAllowedAdminEmail(user.email)) {
      logAdminAuthEvent("mfa_enroll_failed", ip, { reason: "no_session" });
      return adminErrorResponse(ADMIN_ERROR_CODES.SESSION_EXPIRED, 401);
    }

    const confirmed = await confirmAdminMfaEnrollment(supabase, parsed.data);
    if (!confirmed.ok) {
      logAdminAuthEvent("mfa_enroll_failed", ip, { reason: confirmed.error });
      return adminErrorResponse(ADMIN_ERROR_CODES.MFA_INVALID, 401);
    }

    const mfaOk = await hasAdminMfaSatisfied(supabase, user);
    if (!mfaOk) {
      logAdminAuthEvent("mfa_enroll_failed", ip, { reason: "aal" });
      return adminErrorResponse(ADMIN_ERROR_CODES.MFA_INVALID, 401);
    }

    logAdminAuthEvent("mfa_enroll_success", ip);
    logAdminAuthEvent("login_success", ip);
    return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.home }, 200);
  } catch {
    logAdminAuthEvent("mfa_enroll_failed", ip, { reason: "exception" });
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }
}

export function GET() {
  return adminMethodNotAllowed();
}
