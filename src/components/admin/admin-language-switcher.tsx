"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { markLocaleChange, setNextLocaleCookie } from "@/lib/locale-cookie";
import { routing, type Locale } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminLanguageSwitcher() {
  const t = useTranslations("admin.language");
  const tLang = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();

  function switchLocale(next: string) {
    if (!routing.locales.includes(next as Locale) || next === locale) return;
    if (!setNextLocaleCookie(next as Locale)) return;
    markLocaleChange();
    router.refresh();
  }

  return (
    <Select value={locale} onValueChange={switchLocale}>
      <SelectTrigger
        className="h-9 w-[7.5rem] rounded-full px-3 text-xs font-semibold uppercase"
        aria-label={t("label")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map((code) => (
          <SelectItem key={code} value={code} className="uppercase">
            {tLang(code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
