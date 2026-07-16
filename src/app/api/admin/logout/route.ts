import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { jsonResponse } from "@/lib/api/json-response";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { getClientIp } from "@/lib/rate-limit-core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!verifyFormRequestOrigin(request)) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAUTHORIZED_ORIGIN, 403);
  }

  if (!isSupabaseConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  try {
    const supabase = await createSupabaseServerClient();
    // Global : invalide toutes les sessions admin (appareils inclus).
    await supabase.auth.signOut({ scope: "global" });
    logAdminAuthEvent("logout", ip);
    return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.login }, 200);
  } catch {
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }
}

export function GET() {
  return adminMethodNotAllowed();
}
