import type { ReviewStatus } from "@/lib/reviews/store";

const STATUSES = new Set(["all", "pending", "published", "rejected"]);

export function parseAdminReviewsListQuery(url: URL): {
  status: ReviewStatus | "all";
  limit: number;
} {
  const statusRaw = url.searchParams.get("status") ?? "pending";
  const status = STATUSES.has(statusRaw)
    ? (statusRaw as ReviewStatus | "all")
    : "pending";
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) && limitRaw >= 1 ? limitRaw : 50;
  return { status, limit };
}

export function isValidReviewStatus(value: unknown): value is ReviewStatus {
  return value === "pending" || value === "published" || value === "rejected";
}
