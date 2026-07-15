import { sanitizeForMailtoHeader, isValidEmail, normalizeEmail } from "@/lib/form-validation";

const SUBJECT_MAX = 200;

/** Évite l'injection d'en-têtes (CR/LF) dans le sujet Resend. */
export function sanitizeEmailSubject(value: string): string {
  return sanitizeForMailtoHeader(value, SUBJECT_MAX);
}

/**
 * Valide et nettoie reply-to :
 * - pas de CR/LF (injection d'en-têtes)
 * - format email strict
 */
export function sanitizeReplyTo(email: string | undefined): string | undefined {
  if (!email) return undefined;

  const clean = normalizeEmail(email.replace(/[\r\n]/g, ""));
  if (!clean || !isValidEmail(clean)) return undefined;

  return clean;
}
