import { normalizeEmail } from "@/lib/form-validation";
import { countContactSubmissionsInWindow } from "@/lib/contact/messages";
import type { ContactSubmissionWindowStats } from "@/lib/contact/messages";
import { FORM_SECURITY } from "@/lib/security/constants";
import { hashForAudit } from "@/lib/security/fingerprint";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

type RateEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateEntry>();

/** Injecteur test — simule le décompte BDD sans Postgres live. */
let countContactSubmissionsOverride:
  | ((options: {
      since: string;
      email?: string;
      ip?: string;
    }) => Promise<ContactSubmissionWindowStats | null>)
  | null = null;

function pruneMemory(now: number) {
  for (const [key, entry] of memoryStore.entries()) {
    if (now >= entry.resetAt) memoryStore.delete(key);
  }
}

export type DailyLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
  source?: "database" | "memory";
};

/** Évalue un plafond à partir d'un décompte (tests + logique pure). */
export function evaluateDailyLimitFromCount(
  count: number,
  max: number,
  oldestCreatedAtMs: number | null,
  now = Date.now(),
  windowMs = FORM_SECURITY.CONTACT_EMAIL_DAILY_WINDOW_MS
): DailyLimitResult {
  if (count < max) return { allowed: true };

  const retryAfterSec = oldestCreatedAtMs
    ? Math.max(1, Math.ceil((oldestCreatedAtMs + windowMs - now) / 1000))
    : Math.ceil(windowMs / 1000);

  return { allowed: false, retryAfterSec };
}

function checkMemoryDailyLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now()
): DailyLimitResult {
  pruneMemory(now);

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

async function checkDbDailyLimit(
  filter: { email?: string; ip?: string },
  max: number,
  windowMs: number,
  now = Date.now()
): Promise<DailyLimitResult | null> {
  if (!isSupabaseServiceConfigured()) return null;

  const since = new Date(now - windowMs).toISOString();
  const stats = countContactSubmissionsOverride
    ? await countContactSubmissionsOverride({ ...filter, since })
    : await countContactSubmissionsInWindow({ ...filter, since });

  if (stats === null) return null;

  const oldestMs = stats.oldestCreatedAt
    ? new Date(stats.oldestCreatedAt).getTime()
    : null;

  const result = evaluateDailyLimitFromCount(stats.count, max, oldestMs, now, windowMs);
  return { ...result, source: "database" };
}

/** Plafond journalier contact par IP (10 / 24 h) — BDD si dispo, sinon mémoire. */
export async function checkContactIpDailyLimit(
  ip: string,
  now = Date.now()
): Promise<DailyLimitResult> {
  const fromDb = await checkDbDailyLimit(
    { ip },
    FORM_SECURITY.CONTACT_IP_DAILY_MAX,
    FORM_SECURITY.CONTACT_IP_DAILY_WINDOW_MS,
    now
  );
  if (fromDb) return fromDb;

  return checkMemoryDailyLimit(
    `contact-ip:${hashForAudit(ip)}`,
    FORM_SECURITY.CONTACT_IP_DAILY_MAX,
    FORM_SECURITY.CONTACT_IP_DAILY_WINDOW_MS,
    now
  );
}

/** Plafond journalier contact par email (3 / 24 h) — BDD si dispo, sinon mémoire. */
export async function checkContactEmailDailyLimit(
  email: string | undefined,
  now = Date.now()
): Promise<DailyLimitResult> {
  if (!email) return { allowed: true };

  const normalized = normalizeEmail(email);
  const fromDb = await checkDbDailyLimit(
    { email: normalized },
    FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX,
    FORM_SECURITY.CONTACT_EMAIL_DAILY_WINDOW_MS,
    now
  );
  if (fromDb) return fromDb;

  return checkMemoryDailyLimit(
    `contact-email:${hashForAudit(normalized)}`,
    FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX,
    FORM_SECURITY.CONTACT_EMAIL_DAILY_WINDOW_MS,
    now
  );
}

/** Tests unitaires uniquement (fallback mémoire + override BDD). */
export function clearContactDailyLimitsForTests() {
  memoryStore.clear();
  countContactSubmissionsOverride = null;
}

export function setContactSubmissionCounterForTests(
  fn: (options: {
    since: string;
    email?: string;
    ip?: string;
  }) => Promise<ContactSubmissionWindowStats | null>
) {
  countContactSubmissionsOverride = fn;
}
