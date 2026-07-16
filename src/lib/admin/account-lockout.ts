/**
 * OWASP A07 — soft lockout par compte (email hashé), en plus du rate-limit IP.
 * Store mémoire (même limite que le proxy : multi-instance → compléter par Upstash plus tard).
 */
import {
  checkRateLimitInStore,
  pruneRateLimitStore,
} from "@/lib/rate-limit-core";
import { hashForAudit } from "@/lib/security/fingerprint";
import { ADMIN_ACCOUNT_LOCKOUT } from "@/lib/admin/constants";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const accountStore = new Map<string, RateLimitEntry>();

function accountKey(email: string) {
  return `admin-account:${hashForAudit(email.trim().toLowerCase())}`;
}

/** true = verrouillé (trop d'échecs). */
export function isAdminAccountLocked(email: string): {
  locked: boolean;
  retryAfterSec?: number;
} {
  pruneRateLimitStore(accountStore);
  const key = accountKey(email);
  const entry = accountStore.get(key);
  const now = Date.now();

  if (!entry || now >= entry.resetAt) {
    return { locked: false };
  }

  if (entry.count >= ADMIN_ACCOUNT_LOCKOUT.maxFailures) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { locked: false };
}

/** Enregistre un échec d'authentification pour cet email. */
export function recordAdminLoginFailure(email: string): {
  locked: boolean;
  retryAfterSec?: number;
} {
  pruneRateLimitStore(accountStore);
  const result = checkRateLimitInStore(
    accountStore,
    accountKey(email),
    Date.now(),
    ADMIN_ACCOUNT_LOCKOUT.windowMs,
    ADMIN_ACCOUNT_LOCKOUT.maxFailures
  );

  if (!result.allowed) {
    return { locked: true, retryAfterSec: result.retryAfterSec };
  }

  const entry = accountStore.get(accountKey(email));
  if (entry && entry.count >= ADMIN_ACCOUNT_LOCKOUT.maxFailures) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((entry.resetAt - Date.now()) / 1000),
    };
  }

  return { locked: false };
}

/** Réinitialise le compteur après une connexion réussie (mot de passe OK). */
export function clearAdminLoginFailures(email: string) {
  accountStore.delete(accountKey(email));
}
