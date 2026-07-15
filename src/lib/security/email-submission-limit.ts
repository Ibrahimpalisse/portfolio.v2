import { createHash } from "node:crypto";
import { FORM_SECURITY } from "@/lib/security/constants";
import { normalizeEmail } from "@/lib/form-validation";

type RateEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateEntry>();

function hashEmail(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

function prune(now: number) {
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

/** Rate limit secondaire par adresse email (complète le rate limit IP). */
export function checkEmailSubmissionLimit(
  email: string | undefined,
  now = Date.now()
): { allowed: boolean; retryAfterSec?: number } {
  if (!email) return { allowed: true };

  prune(now);

  const key = hashEmail(email);
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + FORM_SECURITY.EMAIL_RATE_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= FORM_SECURITY.EMAIL_RATE_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
