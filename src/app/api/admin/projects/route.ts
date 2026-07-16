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
  parseProjectWriteBody,
} from "@/lib/projects/schema";
import {
  createProject,
  listProjectsForAdmin,
} from "@/lib/projects/store";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

/** GET /api/admin/projects */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request);
  if (!guard.ok) return guard.response;

  const result = await listProjectsForAdmin();
  if (!result.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  logAdminAuthEvent("projects_listed", ip);

  return jsonResponse(
    {
      ok: true,
      configured: result.configured,
      projects: result.projects,
    },
    200
  );
}

/** POST /api/admin/projects */
export async function POST(request: Request) {
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

  const parsedBody = await parseJsonBody(request, PROJECT_LIMITS.maxBodyBytes);
  if (!parsedBody.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const parsed = parseProjectWriteBody(parsedBody.body);
  if (!parsed.ok) {
    return jsonResponse(
      { error: parsed.error, code: ADMIN_ERROR_CODES.INVALID_REQUEST },
      400
    );
  }

  const created = await createProject(parsed.values);
  if (!created.ok) {
    if (created.reason === "duplicate_slug") {
      return jsonResponse(
        { error: "duplicate_slug", code: ADMIN_ERROR_CODES.INVALID_REQUEST },
        409
      );
    }
    logAdminAuthEvent("project_create_failed", ip, { reason: created.reason });
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  logAdminAuthEvent("project_created", ip);
  return jsonResponse({ ok: true, project: created.project }, 201);
}

export function PUT() {
  return adminMethodNotAllowed();
}

export function PATCH() {
  return adminMethodNotAllowed();
}

export function DELETE() {
  return adminMethodNotAllowed();
}
