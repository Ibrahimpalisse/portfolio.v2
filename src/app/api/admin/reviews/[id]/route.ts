import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { jsonResponse } from "@/lib/api/json-response";
import { isValidReviewStatus } from "@/lib/reviews/admin-query";
import {
  deleteReview,
  updateReviewStatus,
  type ReviewStatus,
} from "@/lib/reviews/store";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PATCH — valider / retirer / rejeter. DELETE — suppression définitive. */
export async function PATCH(request: Request, context: RouteContext) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request, { requireOrigin: true });
  if (!guard.ok) return guard.response;

  if (!isSupabaseServiceConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  const { id } = await context.params;
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CONTENT_TYPE, 415);
  }

  const parsedBody = await parseJsonBody(request, 4_096);
  if (!parsedBody.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const status = (parsedBody.body as { status?: string }).status;
  if (!isValidReviewStatus(status)) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const ok = await updateReviewStatus(id, status as ReviewStatus);
  if (!ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }

  logAdminAuthEvent("review_updated", ip, { status });
  return jsonResponse({ ok: true, id, status }, 200);
}

export async function DELETE(request: Request, context: RouteContext) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request, { requireOrigin: true });
  if (!guard.ok) return guard.response;

  if (!isSupabaseServiceConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  const { id } = await context.params;
  const ok = await deleteReview(id);
  if (!ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }

  logAdminAuthEvent("review_deleted", ip);
  return jsonResponse({ ok: true, id }, 200);
}

export function GET() {
  return adminMethodNotAllowed();
}

export function POST() {
  return adminMethodNotAllowed();
}
