"use client";

import { useEffect } from "react";
import { getLocaleDirection, type Locale } from "@/i18n/routing";

type LocaleDocumentSyncProps = {
  locale: Locale;
};

/** Met à jour lang/dir sur <html> après navigation client (App Router). */
export function LocaleDocumentSync({ locale }: LocaleDocumentSyncProps) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getLocaleDirection(locale);
  }, [locale]);

  return null;
}
