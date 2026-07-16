import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { startAdminMfaEnrollment } from "@/lib/admin/mfa";
import { jsonResponse } from "@/lib/api/json-response";
import { getClientIp } from "@/lib/rate-limit-core";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  if (!verifyFormRequestOrigin(request)) {
    logAdminAuthEvent("mfa_enroll_failed", ip, { reason: "origin" });
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAUTHORIZED_ORIGIN, 403);
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

    const enrollment = await startAdminMfaEnrollment(supabase);
    if (!enrollment.ok) {
      if (enrollment.error === "already_enrolled") {
        return adminErrorResponse(ADMIN_ERROR_CODES.MFA_ALREADY_ENROLLED, 409);
      }
      logAdminAuthEvent("mfa_enroll_failed", ip, { reason: enrollment.error });
      return adminErrorResponse(ADMIN_ERROR_CODES.MFA_ENROLL_FAILED, 502);
    }

    logAdminAuthEvent("mfa_enroll_started", ip);
    // OWASP : ne pas renvoyer le secret en clair — le QR suffit (déjà encodé).
    return jsonResponse(
      {
        ok: true,
        factorId: enrollment.data.factorId,
        qrCode: enrollment.data.qrCode,
      },
      200
    );
  } catch {
    logAdminAuthEvent("mfa_enroll_failed", ip, { reason: "exception" });
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }
}

export function GET() {
  return adminMethodNotAllowed();
}
