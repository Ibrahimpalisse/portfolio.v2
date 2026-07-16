export const ADMIN_ROUTES = {
  home: "/admin",
  login: "/admin/connexion",
  messages: "/admin/messages",
  reviews: "/admin/reviews",
  about: "/admin/about",
  projects: "/admin/projects",
  settings: "/admin/settings",
} as const;

export const ADMIN_LOGIN_LIMITS = {
  /** Tentatives max par IP (proxy). */
  maxAttempts: 8,
  windowMs: 15 * 60 * 1000,
  minPasswordLength: 8,
  maxPasswordLength: 128,
  maxEmailLength: 254,
  /** Taille max corps JSON login (email + password + turnstile). */
  maxBodyBytes: 4_096,
} as const;

/** OWASP A07 — lockout soft par email (en complément du rate-limit IP). */
export const ADMIN_ACCOUNT_LOCKOUT = {
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
} as const;

/** Rate-limit MFA challenge / enroll (proxy). */
export const ADMIN_MFA_LIMITS = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
} as const;

/** Politique mot de passe admin (changement) — plus stricte que le login historique. */
export const ADMIN_PASSWORD_CHANGE_LIMITS = {
  minLength: 12,
  maxLength: 128,
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  maxBodyBytes: 4_096,
} as const;

export const ADMIN_SESSION_COOKIE_OPTIONS = {
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
