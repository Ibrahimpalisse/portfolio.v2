export const THEME_STORAGE_KEY = "portfolio-theme";
export const THEME_COOKIE_NAME = "portfolio-theme";
export const THEME_DEFAULT = "light";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function parseThemeSetting(value: string | undefined): ThemeSetting | undefined {
  if (value === "light" || value === "dark" || value === "system") return value;
  return undefined;
}

export function parseResolvedTheme(value: string | undefined): ResolvedTheme | undefined {
  if (value === "light" || value === "dark") return value;
  return undefined;
}

/** Thème résolu pour le rendu SSR (classe sur `<html>`). */
export function getServerResolvedTheme(cookieValue: string | undefined): ResolvedTheme {
  return parseResolvedTheme(cookieValue) ?? (THEME_DEFAULT as ResolvedTheme);
}

export function buildThemeCookie(resolved: ResolvedTheme): string {
  return `${THEME_COOKIE_NAME}=${resolved};path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax`;
}

export function writeThemeCookie(resolved: ResolvedTheme) {
  document.cookie = buildThemeCookie(resolved);
}

export function readStoredThemeSetting(fallback: ThemeSetting): ThemeSetting {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return parseThemeSetting(stored ?? undefined) ?? fallback;
  } catch {
    return fallback;
  }
}

export function resolveThemeSetting(
  setting: ThemeSetting,
  enableSystem: boolean,
  systemTheme: ResolvedTheme
): ResolvedTheme {
  if (setting === "system" && enableSystem) return systemTheme;
  if (setting === "system") return THEME_DEFAULT as ResolvedTheme;
  return setting;
}
