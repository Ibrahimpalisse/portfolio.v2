import { NextResponse } from "next/server";
import { routing, type Locale } from "@/i18n/routing";
import { NEXT_LOCALE_COOKIE } from "@/lib/locale-cookie";

/** Anciennes URLs /fr, /en, /ar → sans préfixe + cookie langue. */
export function redirectLegacyLocalePrefix(request: Request): Response | null {
  const { pathname, search } = new URL(request.url);
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (!routing.locales.includes(maybeLocale as Locale)) {
    return null;
  }

  const rest = "/" + segments.slice(2).join("/");
  const destination = new URL(
    (rest === "/" ? "/" : rest.replace(/\/$/, "") || "/") + search,
    request.url
  );

  const response = NextResponse.redirect(destination);
  response.cookies.set(NEXT_LOCALE_COOKIE, maybeLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
