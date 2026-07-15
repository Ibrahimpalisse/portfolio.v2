import type { Metadata } from "next";
import { ContactPageTrigger } from "@/components/contact-page-trigger";
import { Contact } from "@/components/sections/contact";
import { PageBackBar } from "@/components/page-back-link";
import { brand } from "@/lib/brand";
import { createPageMetadata, routes } from "@/lib/routes";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = createPageMetadata({
  title: `Contact — ${brand.name}`,
  description: `Contactez ${brand.name} pour votre projet web. Réponse sous 48h.`,
  path: routes.contact,
});

export default async function ContactPage() {
  const t = await getTranslations("common");

  return (
    <>
      <ContactPageTrigger />
      <PageBackBar href={routes.home} label={t("backHome")} />
      <Contact />
    </>
  );
}
