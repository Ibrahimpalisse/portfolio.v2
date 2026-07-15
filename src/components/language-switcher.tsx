"use client";

import { hasLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabels, routing, type Locale } from "@/i18n/routing";
import { markLocaleChange, setNextLocaleCookie } from "@/lib/locale-cookie";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
  /** Sans bordure externe — à utiliser dans la barre d’actions de la navbar. */
  embedded?: boolean;
};

function getLocaleFromParams(params: Record<string, string | string[] | undefined>): Locale {
  const value = params.locale;
  const candidate = Array.isArray(value) ? value[0] : value;
  return hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
}

export function LanguageSwitcher({ className, compact, embedded }: LanguageSwitcherProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromParams(params);

  function switchLocale(code: Locale) {
    if (code === locale) return;

    const hash = window.location.hash;

    if (!setNextLocaleCookie(code)) return;

    markLocaleChange();
    router.replace(pathname, { locale: code, scroll: false });

    if (!hash) return;

    requestAnimationFrame(() => {
      const url = `${window.location.pathname}${window.location.search}${hash}`;
      window.history.replaceState(null, "", url);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center",
        embedded
          ? "gap-0.5"
          : "gap-0.5 rounded-full border border-border bg-background/80 p-0.5",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLocale(code)}
          className={cn(
            "rounded-full text-center text-[11px] font-semibold uppercase tracking-wide transition-all",
            embedded ? "min-w-[2rem] px-2 py-1.5" : "min-w-[2.25rem] px-2.5 py-1",
            locale === code
              ? "bg-step-accent text-primary-foreground shadow-sm"
              : "text-foreground/55 hover:bg-muted/70 hover:text-foreground"
          )}
          aria-current={locale === code ? "true" : undefined}
          aria-label={localeLabels[code]}
        >
          {compact ? code.toUpperCase() : code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
