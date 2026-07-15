import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export const NEXT_LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_CHANGE_EVENT = "locale-change-start";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/**
 * Met à jour le cookie lu par le middleware next-intl avant navigation.
 * Rejette toute valeur hors locales autorisées (anti cookie-injection).
 */
export function setNextLocaleCookie(locale: string): boolean {
  if (!hasLocale(routing.locales, locale)) {
    return false;
  }

  document.cookie = `${NEXT_LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; samesite=lax`;
  return true;
}

/** Déclenche la barre de progression en tête de page (sans hard reload). */
export function markLocaleChange() {
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}
