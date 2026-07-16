import { requireAdminApi } from "@/lib/admin/require-admin-api";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import {
  ABOUT_STATS_LIMITS,
  parseAboutStatsUpdateBody,
} from "@/lib/about/schema";
import {
  getAboutStatsForAdmin,
  upsertAboutStats,
} from "@/lib/about/store";
import { jsonResponse } from "@/lib/api/json-response";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

/** GET /api/admin/about-stats */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request);
  if (!guard.ok) return guard.response;

  const result = await getAboutStatsForAdmin();
  if (!result.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  logAdminAuthEvent("about_stats_listed", ip);

  return jsonResponse(
    {
      ok: true,
      configured: result.configured,
      stats: result.stats,
      updatedAt: result.updatedAt,
    },
    200
  );
}

/** PATCH /api/admin/about-stats */
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
    ABOUT_STATS_LIMITS.maxBodyBytes
  );
  if (!parsedBody.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const parsed = parseAboutStatsUpdateBody(parsedBody.body);
  if (!parsed.ok) {
    return jsonResponse(
      { error: parsed.error, code: ADMIN_ERROR_CODES.INVALID_REQUEST },
      400
    );
  }

  const saved = await upsertAboutStats(parsed.values);
  if (!saved.ok) {
    logAdminAuthEvent("about_stats_update_failed", ip, {
      reason: saved.reason,
    });
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  logAdminAuthEvent("about_stats_updated", ip);

  return jsonResponse(
    {
      ok: true,
      configured: true,
      stats: saved.stats,
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
