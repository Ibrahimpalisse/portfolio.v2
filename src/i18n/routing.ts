import { defineRouting } from "next-intl/routing";

export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "fr",
  // Langue via cookie NEXT_LOCALE — jamais /fr, /en, /ar dans l’URL
  localePrefix: "never",
});

export const localeLabels: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export const ogLocales: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_US",
  ar: "ar_SA",
};

export function getLocaleDirection(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}
