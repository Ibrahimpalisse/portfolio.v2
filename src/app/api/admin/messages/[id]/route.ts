import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
} from "@/lib/admin/error-response";
import { jsonResponse } from "@/lib/api/json-response";
import { isValidContactMessageStatus } from "@/lib/contact/admin-messages-query";
import { parseArchiveMeta } from "@/lib/contact/archive-meta";
import {
  deleteContactMessage,
  updateContactMessageStatus,
  type ContactMessageStatus,
} from "@/lib/contact/messages";
import { getClientIp } from "@/lib/rate-limit-core";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PATCH — marquer lu / archivé (+ meta archive). DELETE — suppression. */
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

  // Note archive jusqu'à ~2 Ko + URL → 8 Ko max
  const parsedBody = await parseJsonBody(request, 8_192);
  if (!parsedBody.ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  const status = (parsedBody.body as { status?: string }).status;
  if (!isValidContactMessageStatus(status)) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
  }

  let archiveNote: string | null | undefined;
  let conversationUrl: string | null | undefined;

  if (status === "archived") {
    const meta = parseArchiveMeta(parsedBody.body);
    if (!meta.ok) {
      return adminErrorResponse(ADMIN_ERROR_CODES.INVALID_REQUEST, 400);
    }
    archiveNote = meta.data.archiveNote;
    conversationUrl = meta.data.conversationUrl;
  }

  const ok = await updateContactMessageStatus(id, {
    status: status as ContactMessageStatus,
    archiveNote,
    conversationUrl,
  });
  if (!ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }

  logAdminAuthEvent("message_updated", ip, { status });
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
  const ok = await deleteContactMessage(id);
  if (!ok) {
    return adminErrorResponse(ADMIN_ERROR_CODES.INTERNAL, 502);
  }

  logAdminAuthEvent("message_deleted", ip);
  return jsonResponse({ ok: true, id }, 200);
}

export function GET() {
  return adminMethodNotAllowed();
}

export function POST() {
  return adminMethodNotAllowed();
}
