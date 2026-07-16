/** Limites de sécurité centralisées pour les formulaires et l'envoi d'emails. */
export const FORM_SECURITY = {
  /** Taille max du corps JSON (12 Ko). */
  MAX_BODY_BYTES: 12_288,
  /** Nombre max de clés au niveau racine du JSON. */
  MAX_ROOT_KEYS: 10,
  /** Fenêtre anti-doublon (double-clic / rejeu rapide). */
  DEDUP_WINDOW_MS: 60_000,
  /** Rate limit par email (complète le rate limit IP du proxy). */
  EMAIL_RATE_WINDOW_MS: 60 * 60 * 1000,
  EMAIL_RATE_MAX: 5,
  /** Contact — plafond journalier par IP (complète le rate limit 15 min du proxy). */
  CONTACT_IP_DAILY_MAX: 10,
  CONTACT_IP_DAILY_WINDOW_MS: 24 * 60 * 60 * 1000,
  /** Contact — plafond journalier par adresse email. */
  CONTACT_EMAIL_DAILY_MAX: 3,
  CONTACT_EMAIL_DAILY_WINDOW_MS: 24 * 60 * 60 * 1000,
  /**
   * Avis — plafond journalier par IP (pas 1 à vie : Wi‑Fi partagé / CGNAT).
   * Unicité forte = 1 avis actif par email (pending|published).
   */
  REVIEW_IP_DAILY_MAX: 2,
  REVIEW_IP_DAILY_WINDOW_MS: 24 * 60 * 60 * 1000,
  /** Timeout vérification Turnstile. */
  TURNSTILE_TIMEOUT_MS: 5_000,
  /** Timeout envoi Resend. */
  RESEND_TIMEOUT_MS: 10_000,
} as const;
