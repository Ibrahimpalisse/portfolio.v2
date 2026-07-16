import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { adminMfaRequired, startAdminMfaChallenge } from "@/lib/admin/mfa";
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
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAUTHORIZED_ORIGIN, 403);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAllowedAdminEmail(user.email)) {
      return adminErrorResponse(ADMIN_ERROR_CODES.SESSION_EXPIRED, 401);
    }

    const needsMfa = await adminMfaRequired(supabase);
    if (!needsMfa) {
      return adminErrorResponse(ADMIN_ERROR_CODES.MFA_ALREADY_DONE, 400);
    }

    const challenge = await startAdminMfaChallenge(supabase);
    if (!challenge.ok) {
      logAdminAuthEvent("mfa_failed", ip, { reason: challenge.error });
      return adminErrorResponse(ADMIN_ERROR_CODES.MFA_NOT_CONFIGURED, 403);
    }

    logAdminAuthEvent("mfa_challenge", ip);
    return jsonResponse(
      {
        ok: true,
        factorId: challenge.data.factorId,
        challengeId: challenge.data.challengeId,
      },
      200
    );
  } catch {
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }
}

export function GET() {
  return adminMethodNotAllowed();
}
