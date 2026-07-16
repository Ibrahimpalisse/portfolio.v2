import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { jsonResponse } from "@/lib/api/json-response";
import {
  PROJECT_LIMITS,
  parseProjectPatchBody,
} from "@/lib/projects/schema";
import { deleteProject, updateProject } from "@/lib/projects/store";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PATCH /api/admin/projects/[id] */
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

  const parsedBody = await parseJsonBody(request, PROJECT_LIMITS.maxBodyBytes);
  if (!parsedBody.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const parsed = parseProjectPatchBody(parsedBody.body);
  if (!parsed.ok) {
    return jsonResponse(
      { error: parsed.error, code: ADMIN_ERROR_CODES.INVALID_REQUEST },
      400
    );
  }

  const updated = await updateProject(id, parsed.values);
  if (!updated.ok) {
    if (updated.reason === "invalid_id" || updated.reason === "duplicate_slug") {
      return jsonResponse(
        { error: updated.reason, code: ADMIN_ERROR_CODES.INVALID_REQUEST },
        updated.reason === "duplicate_slug" ? 409 : 400
      );
    }
    logAdminAuthEvent("project_update_failed", ip, { reason: updated.reason });
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  logAdminAuthEvent("project_updated", ip);
  return jsonResponse({ ok: true, project: updated.project }, 200);
}

/** DELETE /api/admin/projects/[id] */
export async function DELETE(request: Request, context: RouteContext) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request, { requireOrigin: true });
  if (!guard.ok) return guard.response;

  if (!isSupabaseServiceConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  const { id } = await context.params;
  const ok = await deleteProject(id);
  if (!ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }

  logAdminAuthEvent("project_deleted", ip);
  return jsonResponse({ ok: true, id }, 200);
}

export function GET() {
  return adminMethodNotAllowed();
}

export function POST() {
  return adminMethodNotAllowed();
}
