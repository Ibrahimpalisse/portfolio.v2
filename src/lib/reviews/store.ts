import { hashForAudit } from "@/lib/security/fingerprint";
import { normalizeEmail } from "@/lib/form-validation";
import {
  createSupabaseServiceClient,
  isSupabaseServiceConfigured,
} from "@/lib/supabase/service";
import type { ReviewItem } from "@/data/reviews";
import { reviews as demoReviews } from "@/data/reviews";

export type ReviewStatus = "pending" | "published" | "rejected";

export type ReviewRow = {
  id: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  name: string;
  email: string;
  role: string | null;
  message: string;
  rating: number;
  status: ReviewStatus;
  fingerprint: string | null;
  ip_hash: string | null;
};

export type SaveReviewInput = {
  name: string;
  email: string;
  role?: string;
  message: string;
  rating: number;
  fingerprint: string;
  ip: string;
  userAgent?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function reviewRowToItem(row: Pick<ReviewRow, "id" | "name" | "role" | "message" | "rating">): ReviewItem {
  return {
    id: row.id,
    name: row.name,
    role: row.role?.trim() || "",
    text: row.message,
    rating: row.rating,
  };
}

/**
 * Avis publiés pour le site. Si Supabase non configuré → démos locales.
 * Si configuré → uniquement les `published` (peut être vide).
 */
export async function getPublishedReviews(): Promise<ReviewItem[]> {
  if (!isSupabaseServiceConfigured()) {
    return demoReviews;
  }

  const rows = await listReviews({ status: "published", limit: 100 });
  return rows.map(reviewRowToItem);
}

export type SaveReviewResult =
  | { ok: true; id: string; duplicate?: boolean }
  | { ok: false; reason?: "duplicate_email" | "persist_failed" | "not_configured" };

/**
 * Avis déjà actif (pending ou published) pour cet email.
 */
export async function findActiveReviewByEmail(
  email: string
): Promise<{ id: string; status: ReviewStatus; name: string } | null> {
  if (!isSupabaseServiceConfigured()) return null;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const normalized = normalizeEmail(email);
  const { data, error } = await supabase
    .from("reviews")
    .select("id, status, name")
    .eq("email", normalized)
    .in("status", ["pending", "published"])
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as { id: string; status: ReviewStatus; name: string };
}

export async function countReviewsInWindow(options: {
  since: string;
  ip?: string;
  email?: string;
}): Promise<{ count: number; oldestCreatedAt: string | null } | null> {
  if (!isSupabaseServiceConfigured()) return null;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  let countQuery = supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .gte("created_at", options.since);

  if (options.email) {
    countQuery = countQuery.eq("email", normalizeEmail(options.email));
  }
  if (options.ip) {
    countQuery = countQuery.eq("ip_hash", hashForAudit(options.ip));
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    console.error("[reviews] window count failed", countError.code ?? "unknown");
    return null;
  }

  let oldestQuery = supabase
    .from("reviews")
    .select("created_at")
    .gte("created_at", options.since)
    .order("created_at", { ascending: true })
    .limit(1);

  if (options.email) {
    oldestQuery = oldestQuery.eq("email", normalizeEmail(options.email));
  }
  if (options.ip) {
    oldestQuery = oldestQuery.eq("ip_hash", hashForAudit(options.ip));
  }

  const { data: oldestRows, error: oldestError } = await oldestQuery;
  if (oldestError) {
    console.error("[reviews] window oldest failed", oldestError.code ?? "unknown");
    return null;
  }

  return {
    count: count ?? 0,
    oldestCreatedAt: oldestRows?.[0]?.created_at ?? null,
  };
}

export async function saveReview(
  input: SaveReviewInput
): Promise<SaveReviewResult> {
  if (!isSupabaseServiceConfigured()) return { ok: false, reason: "not_configured" };

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const email = normalizeEmail(input.email);
  const existing = await findActiveReviewByEmail(email);
  if (existing) {
    return { ok: false, reason: "duplicate_email" };
  }

  const row = {
    name: input.name,
    email,
    role: input.role?.trim() || null,
    message: input.message,
    rating: input.rating,
    fingerprint: input.fingerprint,
    ip_hash: hashForAudit(input.ip),
    user_agent_hash: input.userAgent
      ? hashForAudit(input.userAgent.slice(0, 256))
      : null,
    status: "pending" as const,
  };

  const { data, error } = await supabase
    .from("reviews")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      // fingerprint OU email unique actif
      if (String(error.message ?? "").toLowerCase().includes("email")) {
        return { ok: false, reason: "duplicate_email" };
      }
      return { ok: true, id: "duplicate", duplicate: true };
    }
    console.error("[reviews] persist failed", error.code ?? "unknown");
    return { ok: false, reason: "persist_failed" };
  }

  if (!data?.id) return { ok: false, reason: "persist_failed" };
  return { ok: true, id: data.id };
}

export async function listReviews(options?: {
  status?: ReviewStatus | "all";
  limit?: number;
}): Promise<ReviewRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  let query = supabase
    .from("reviews")
    .select(
      "id, created_at, updated_at, published_at, name, email, role, message, rating, status, fingerprint, ip_hash"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[reviews] list failed", error?.code ?? "unknown");
    return [];
  }

  return data as ReviewRow[];
}

export async function countReviewsByStatus(
  status: ReviewStatus
): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) return 0;
  return count ?? 0;
}

export async function updateReviewStatus(
  id: string,
  status: ReviewStatus
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase || !UUID_RE.test(id)) return false;

  const patch: Record<string, string | null> = { status };
  if (status === "published") {
    patch.published_at = new Date().toISOString();
  } else {
    // Retirer / rejeter → plus visible
    patch.published_at = null;
  }

  const { error } = await supabase.from("reviews").update(patch).eq("id", id);
  return !error;
}

export async function deleteReview(id: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase || !UUID_RE.test(id)) return false;

  const { error } = await supabase.from("reviews").delete().eq("id", id);
  return !error;
}
