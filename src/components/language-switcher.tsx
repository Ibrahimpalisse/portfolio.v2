"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/routing";
import { markLocaleChange, setNextLocaleCookie } from "@/lib/locale-cookie";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
  /** Sans bordure externe — à utiliser dans la barre d’actions de la navbar. */
  embedded?: boolean;
};

export function LanguageSwitcher({ className, compact, embedded }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as Locale;

  function switchLocale(code: Locale) {
    if (code === locale) return;

    const hash = window.location.hash;

    if (!setNextLocaleCookie(code)) return;

    markLocaleChange();
    // localePrefix: never → même URL, cookie + refresh
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
