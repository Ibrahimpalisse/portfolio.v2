export const ADMIN_ROUTES = {
  home: "/admin",
  login: "/admin/connexion",
} as const;

export const ADMIN_LOGIN_LIMITS = {
  /** Tentatives max par IP (proxy). */
  maxAttempts: 8,
  windowMs: 15 * 60 * 1000,
  minPasswordLength: 8,
  maxPasswordLength: 128,
  maxEmailLength: 254,
  /** Taille max corps JSON login. */
  maxBodyBytes: 2_048,
} as const;

export const ADMIN_SESSION_COOKIE_OPTIONS = {
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
