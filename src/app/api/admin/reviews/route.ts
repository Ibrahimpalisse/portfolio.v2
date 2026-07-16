import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { adminMethodNotAllowed } from "@/lib/admin/error-response";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { jsonResponse } from "@/lib/api/json-response";
import { parseAdminReviewsListQuery } from "@/lib/reviews/admin-query";
import {
  countReviewsByStatus,
  listReviews,
} from "@/lib/reviews/store";
import { getClientIp } from "@/lib/rate-limit-core";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

/** GET /api/admin/reviews?status=pending|published|rejected|all&limit=50 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const guard = await requireAdminApi(request);
  if (!guard.ok) return guard.response;

  if (!isSupabaseServiceConfigured()) {
    return jsonResponse(
      {
        ok: true,
        configured: false,
        reviews: [],
        pendingCount: 0,
      },
      200
    );
  }

  const url = new URL(request.url);
  const { status, limit } = parseAdminReviewsListQuery(url);

  const [reviews, pendingCount] = await Promise.all([
    listReviews({ status, limit }),
    countReviewsByStatus("pending"),
  ]);

  logAdminAuthEvent("reviews_listed", ip);

  return jsonResponse(
    {
      ok: true,
      configured: true,
      reviews,
      pendingCount,
    },
    200
  );
}

export function POST() {
  return adminMethodNotAllowed();
}
