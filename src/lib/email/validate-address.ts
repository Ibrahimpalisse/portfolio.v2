import { isValidEmail, normalizeEmail } from "@/lib/form-validation";

const FROM_WITH_NAME_RE =
  /^[^<>\r\n]+<\s*([^\s@<>]+@[^\s@<>]+)\s*>$/;
const PLAIN_EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+$/;

/** Valide le format `Nom <email@domaine>` ou email simple. */
export function isValidFromAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 320) return false;

  const named = FROM_WITH_NAME_RE.exec(trimmed);
  if (named) {
    return isValidEmail(normalizeEmail(named[1]));
  }

  return isValidEmail(normalizeEmail(trimmed));
}

/** Valide une adresse destinataire Resend. */
export function isValidNotifyAddress(value: string): boolean {
  return isValidEmail(normalizeEmail(value));
}

/** Extrait l'email d'une adresse `Nom <email>` ou retourne la valeur normalisée. */
export function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const named = FROM_WITH_NAME_RE.exec(trimmed);
  if (named) return normalizeEmail(named[1]);
  return normalizeEmail(trimmed);
}
