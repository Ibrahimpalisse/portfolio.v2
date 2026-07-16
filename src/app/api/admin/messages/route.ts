import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { adminMethodNotAllowed } from "@/lib/admin/error-response";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { jsonResponse } from "@/lib/api/json-response";
import { parseAdminMessagesListQuery } from "@/lib/contact/admin-messages-query";
import {
  countUnreadContactMessages,
  listContactMessages,
} from "@/lib/contact/messages";
import { getClientIp } from "@/lib/rate-limit-core";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

/** GET /api/admin/messages?status=unread|read|archived|all&limit=50 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request);
  if (!guard.ok) return guard.response;

  if (!isSupabaseServiceConfigured()) {
    return jsonResponse(
      {
        ok: true,
        configured: false,
        messages: [],
        unreadCount: 0,
      },
      200
    );
  }

  const url = new URL(request.url);
  const { status, limit } = parseAdminMessagesListQuery(url);

  const [messages, unreadCount] = await Promise.all([
    listContactMessages({ status, limit }),
    countUnreadContactMessages(),
  ]);

  logAdminAuthEvent("messages_listed", ip);

  return jsonResponse(
    {
      ok: true,
      configured: true,
      messages,
      unreadCount,
    },
    200
  );
}

export function POST() {
  return adminMethodNotAllowed();
}
