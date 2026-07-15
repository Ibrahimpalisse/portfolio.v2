"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ContactOpenLink } from "@/components/contact-open-link";
import { Button } from "@/components/ui/button";

export function FooterContactButton() {
  const t = useTranslations("nav");

  return (
    <Button asChild size="sm" className="mt-1 w-fit">
      <ContactOpenLink>
        {t("workTogether")}
        <ArrowUpRight className="h-4 w-4" />
      </ContactOpenLink>
    </Button>
  );
}
