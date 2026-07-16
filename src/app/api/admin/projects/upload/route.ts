import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { jsonResponse } from "@/lib/api/json-response";
import { PROJECT_LIMITS } from "@/lib/projects/schema";
import { uploadProjectImage } from "@/lib/projects/storage";
import { getClientIp } from "@/lib/rate-limit-core";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

/** POST /api/admin/projects/upload — multipart field `file` */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request, { requireOrigin: true });
  if (!guard.ok) return guard.response;

  if (!isSupabaseServiceConfigured()) {
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_CONTENT_TYPE, 415);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  if (file.size > PROJECT_LIMITS.uploadMaxBytes) {
    return jsonResponse(
      { error: "too_large", code: ADMIN_ERROR_CODES.INVALID_REQUEST },
      400
    );
  }

  const uploaded = await uploadProjectImage(file);
  if (!uploaded.ok) {
    if (uploaded.reason === "invalid_type" || uploaded.reason === "too_large") {
      return jsonResponse(
        { error: uploaded.reason, code: ADMIN_ERROR_CODES.INVALID_REQUEST },
        400
      );
    }
    logAdminAuthEvent("project_upload_failed", ip, {
      reason: uploaded.reason,
    });
    return adminErrorResponse(ADMIN_ERROR_CODES.UNAVAILABLE, 503);
  }

  logAdminAuthEvent("project_uploaded", ip);
  return jsonResponse(
    { ok: true, url: uploaded.url, path: uploaded.path },
    201
  );
}

export function GET() {
  return adminMethodNotAllowed();
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
