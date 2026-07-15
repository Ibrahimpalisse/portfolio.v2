/** Validation email — alignée OWASP (format basique, pas de validation unique côté client). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Supprime caractères de contrôle (NULL bytes, etc.). */
export function stripControlChars(value: string): string {
  return value.replace(/[\0-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/** Normalise une adresse email (trim, minuscules). */
export function normalizeEmail(email: string): string {
  return stripControlChars(email).trim().toLowerCase();
}

/** Nettoie une chaîne avant affichage ou envoi. */
export function sanitizeText(value: string, maxLength: number): string {
  return stripControlChars(value).trim().slice(0, maxLength);
}

/**
 * Nettoie un nom affiché (personne, rôle) :
 * pas de retours ligne, pas de chevrons HTML.
 */
export function sanitizePersonName(value: string, maxLength: number): string {
  return sanitizeText(
    value.replace(/[\r\n<>]/g, " ").replace(/\s+/g, " "),
    maxLength
  );
}

/** Évite l'injection dans les en-têtes mailto (CR/LF). */
export function sanitizeForMailtoHeader(value: string, maxLength: number): string {
  return sanitizeText(value.replace(/[\r\n]/g, " "), maxLength);
}

export function isHoneypotTriggered(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 254 && EMAIL_RE.test(normalized);
}

/** Limite la taille totale d'une URL mailto (navigateurs ~2000 car.). */
export const MAILTO_MAX_URL_LENGTH = 1800;

export function buildSafeMailtoUrl(
  email: string,
  subject: string,
  body: string
): string | null {
  const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return url.length <= MAILTO_MAX_URL_LENGTH ? url : null;
}
