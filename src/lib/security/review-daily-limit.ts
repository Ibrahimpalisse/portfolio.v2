import { FORM_SECURITY } from "@/lib/security/constants";
import { hashForAudit } from "@/lib/security/fingerprint";
import { evaluateDailyLimitFromCount } from "@/lib/security/contact-daily-limit";
import { countReviewsInWindow } from "@/lib/reviews/store";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

type RateEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateEntry>();

let countReviewsOverride:
  | ((options: {
      since: string;
      ip?: string;
      email?: string;
    }) => Promise<{ count: number; oldestCreatedAt: string | null } | null>)
  | null = null;

function pruneMemory(now: number) {
  for (const [key, entry] of memoryStore.entries()) {
    if (now >= entry.resetAt) memoryStore.delete(key);
  }
}

export type ReviewIpLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
  source?: "database" | "memory";
};

function checkMemoryIpLimit(ip: string, now = Date.now()): ReviewIpLimitResult {
  pruneMemory(now);
  const key = `review-ip:${hashForAudit(ip)}`;
  const max = FORM_SECURITY.REVIEW_IP_DAILY_MAX;
  const windowMs = FORM_SECURITY.REVIEW_IP_DAILY_WINDOW_MS;
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, source: "memory" };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
      source: "memory",
    };
  }

  entry.count += 1;
  return { allowed: true, source: "memory" };
}

/**
 * Plafond avis / IP / jour (défaut 2).
 * Évite le spam sans bloquer à vie les réseaux partagés.
 */
export async function checkReviewIpDailyLimit(
  ip: string,
  now = Date.now()
): Promise<ReviewIpLimitResult> {
  if (!ip || ip === "unknown") {
    return checkMemoryIpLimit(ip || "unknown", now);
  }

  if (isSupabaseServiceConfigured()) {
    const since = new Date(
      now - FORM_SECURITY.REVIEW_IP_DAILY_WINDOW_MS
    ).toISOString();
    const counter = countReviewsOverride ?? countReviewsInWindow;
    const stats = await counter({ since, ip });
    if (stats) {
      const result = evaluateDailyLimitFromCount(
        stats.count,
        FORM_SECURITY.REVIEW_IP_DAILY_MAX,
        stats.oldestCreatedAt ? Date.parse(stats.oldestCreatedAt) : null,
        now,
        FORM_SECURITY.REVIEW_IP_DAILY_WINDOW_MS
      );
      return { ...result, source: "database" };
    }
  }

  return checkMemoryIpLimit(ip, now);
}

/** Tests uniquement. */
export function clearReviewDailyLimitsForTests() {
  memoryStore.clear();
  countReviewsOverride = null;
}

/** Tests uniquement. */
export function setReviewSubmissionCounterForTests(
  fn:
    | ((options: {
        since: string;
        ip?: string;
        email?: string;
      }) => Promise<{ count: number; oldestCreatedAt: string | null } | null>)
    | null
) {
  countReviewsOverride = fn;
}
