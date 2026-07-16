/**
 * Codes d'erreur stables (OWASP A09 / i18n-ready).
 * Le client peut traduire via `admin.errors.<code>` ; `error` reste un fallback FR.
 */
export const ADMIN_ERROR_CODES = {
  UNAVAILABLE: "unavailable",
  UNAUTHORIZED_ORIGIN: "unauthorized_origin",
  INVALID_REQUEST: "invalid_request",
  INVALID_CONTENT_TYPE: "invalid_content_type",
  RATE_LIMITED: "rate_limited",
  INVALID_CREDENTIALS: "invalid_credentials",
  TURNSTILE_FAILED: "turnstile_failed",
  SESSION_EXPIRED: "session_expired",
  MFA_REQUIRED: "mfa_required",
  MFA_INVALID: "mfa_invalid",
  MFA_ALREADY_DONE: "mfa_already_done",
  MFA_NOT_CONFIGURED: "mfa_not_configured",
  MFA_ENROLL_FAILED: "mfa_enroll_failed",
  MFA_ALREADY_ENROLLED: "mfa_already_enrolled",
  PASSWORD_REAUTH_FAILED: "password_reauth_failed",
  PASSWORD_UPDATE_FAILED: "password_update_failed",
  PASSWORD_WEAK: "password_weak",
  PASSWORD_SAME: "password_same",
  ACCOUNT_LOCKED: "account_locked",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  INTERNAL: "internal",
} as const;

export type AdminErrorCode =
  (typeof ADMIN_ERROR_CODES)[keyof typeof ADMIN_ERROR_CODES];

/** Fallback FR (ou ES/AR via messages.admin.errors plus tard). */
export const ADMIN_ERROR_MESSAGES: Record<AdminErrorCode, string> = {
  unavailable: "Service temporairement indisponible.",
  unauthorized_origin: "Requête non autorisée.",
  invalid_request: "Requête invalide.",
  invalid_content_type: "Requête invalide.",
  rate_limited: "Trop de tentatives. Réessayez plus tard.",
  invalid_credentials: "Identifiants invalides ou accès refusé.",
  turnstile_failed: "Vérification anti-spam échouée. Réessayez.",
  session_expired: "Session expirée. Reconnectez-vous.",
  mfa_required: "Authentification MFA requise pour cette action.",
  mfa_invalid: "Code invalide ou expiré. Réessayez.",
  mfa_already_done: "Vérification déjà effectuée.",
  mfa_not_configured:
    "Authentification TOTP non configurée. Activez-la dans Supabase (Authentication → MFA).",
  mfa_enroll_failed: "Impossible de générer le QR TOTP. Réessayez.",
  mfa_already_enrolled:
    "Un facteur TOTP est déjà actif. Utilisez l'étape de vérification.",
  password_reauth_failed:
    "Impossible de modifier le mot de passe. Vérifiez le mot de passe actuel.",
  password_update_failed:
    "Impossible d'enregistrer le nouveau mot de passe. Réessayez dans un instant.",
  password_weak:
    "Ce mot de passe est trop faible ou compromis. Choisissez-en un autre.",
  password_same: "Le nouveau mot de passe doit être différent de l'actuel.",
  account_locked:
    "Compte temporairement verrouillé après trop d'échecs. Réessayez plus tard.",
  method_not_allowed: "Method not allowed",
  internal: "Une erreur est survenue. Réessayez.",
};
