import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { NEXT_LOCALE_COOKIE } from "@/lib/locale-cookie";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  let locale = hasLocale(routing.locales, requested) ? requested : null;

  // Routes hors [locale] (ex. /admin) : lire le cookie site.
  if (!locale) {
    const store = await cookies();
    const fromCookie = store.get(NEXT_LOCALE_COOKIE)?.value;
    if (fromCookie && hasLocale(routing.locales, fromCookie)) {
      locale = fromCookie;
    }
  }

  if (!locale) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
