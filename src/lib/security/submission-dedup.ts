import { FORM_SECURITY } from "@/lib/security/constants";

type DedupEntry = {
  expiresAt: number;
};

const store = new Map<string, DedupEntry>();

function prune(now: number) {
  for (const [key, entry] of store.entries()) {
    if (now >= entry.expiresAt) store.delete(key);
  }
}

/**
 * Détecte une soumission dupliquée (double-clic, rejeu rapide).
 * Retourne true si la soumission a déjà été vue récemment.
 */
export function isDuplicateSubmission(fingerprint: string, now = Date.now()): boolean {
  prune(now);

  const existing = store.get(fingerprint);
  if (existing && now < existing.expiresAt) {
    return true;
  }

  store.set(fingerprint, {
    expiresAt: now + FORM_SECURITY.DEDUP_WINDOW_MS,
  });

  return false;
}
