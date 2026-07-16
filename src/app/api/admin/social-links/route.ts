import { requireAdminApi } from "@/lib/admin/require-admin-api";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import {
  SITE_SOCIAL_LIMITS,
  parseSiteSocialUpdateBody,
} from "@/lib/social/schema";
import {
  getSiteSettingsForAdmin,
  upsertSiteSocialLinks,
} from "@/lib/social/store";
import { jsonResponse } from "@/lib/api/json-response";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

/** GET /api/admin/social-links */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request);
  if (!guard.ok) return guard.response;

  const result = await getSiteSettingsForAdmin();
  if (!result.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  logAdminAuthEvent("social_links_listed", ip);

  return jsonResponse(
    {
      ok: true,
      configured: result.configured,
      settings: result.settings,
      // compat anciennes réponses
      links: result.settings,
      updatedAt: result.updatedAt,
    },
    200
  );
}

/** PATCH /api/admin/social-links */
export async function PATCH(request: Request) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request, { requireOrigin: true });
  if (!guard.ok) return guard.response;

  if (!isSupabaseServiceConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CONTENT_TYPE, 415);
  }

  const parsedBody = await parseJsonBody(
    request,
    SITE_SOCIAL_LIMITS.maxBodyBytes
  );
  if (!parsedBody.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const parsed = parseSiteSocialUpdateBody(parsedBody.body);
  if (!parsed.ok) {
    return jsonResponse(
      { error: parsed.error, code: ADMIN_ERROR_CODES.INVALID_REQUEST },
      400
    );
  }

  const saved = await upsertSiteSocialLinks(parsed.values);
  if (!saved.ok) {
    logAdminAuthEvent("social_links_update_failed", ip, {
      reason: saved.reason,
    });
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  logAdminAuthEvent("social_links_updated", ip);

  return jsonResponse(
    {
      ok: true,
      configured: true,
      settings: saved.settings,
      links: saved.settings,
      updatedAt: saved.updatedAt,
    },
    200
  );
}

export function POST() {
  return adminMethodNotAllowed();
}

export function PUT() {
  return adminMethodNotAllowed();
}

export function DELETE() {
  return adminMethodNotAllowed();
}
