"use client";

import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";

export function SkipToContent() {
  const t = useTranslations("common");

  return (
    <a
      href={`${routes.home}#main-content`}
      suppressHydrationWarning
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-full focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg rtl:focus:left-auto rtl:focus:right-4"
    >
      {t("skipToContent")}
    </a>
  );
}
