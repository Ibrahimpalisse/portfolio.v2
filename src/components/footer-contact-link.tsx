"use client";

import { useTranslations } from "next-intl";
import { ContactOpenLink } from "@/components/contact-open-link";

const footerLinkClass =
  "text-sm text-foreground/65 underline-offset-4 transition-colors hover:text-step-accent hover:underline";

export function FooterContactLink() {
  const t = useTranslations("nav");

  return (
    <ContactOpenLink className={footerLinkClass}>
      {t("workTogether")}
    </ContactOpenLink>
  );
}
