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
  /** Timeout vérification Turnstile. */
  TURNSTILE_TIMEOUT_MS: 5_000,
  /** Timeout envoi Resend. */
  RESEND_TIMEOUT_MS: 10_000,
} as const;
