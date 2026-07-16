import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { NEXT_LOCALE_COOKIE } from "@/lib/locale-cookie";
import { routing, type Locale } from "@/i18n/routing";

/** Locale admin = cookie site (NEXT_LOCALE), défaut fr. */
export async function getAdminLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(NEXT_LOCALE_COOKIE)?.value;
  if (raw && hasLocale(routing.locales, raw)) {
    return raw;
  }
  return routing.defaultLocale;
}

export async function getAdminMessages(locale: Locale) {
  // src/lib/admin → ../../../messages (racine projet)
  return (await import(`../../../messages/${locale}.json`)).default;
}
