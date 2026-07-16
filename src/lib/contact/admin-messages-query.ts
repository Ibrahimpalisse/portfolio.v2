import type { ContactMessageStatus } from "@/lib/contact/messages";

const STATUSES = new Set(["all", "unread", "read", "archived"]);

export function parseAdminMessagesListQuery(url: URL): {
  status: ContactMessageStatus | "all";
  limit: number;
} {
  const statusRaw = url.searchParams.get("status") ?? "all";
  const status = STATUSES.has(statusRaw)
    ? (statusRaw as ContactMessageStatus | "all")
    : "all";
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? limitRaw : 50;
  return { status, limit };
}

export function isValidContactMessageStatus(
  value: unknown
): value is ContactMessageStatus {
  return value === "unread" || value === "read" || value === "archived";
}
