import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBackBar } from "@/components/page-back-link";
import { Services } from "@/components/sections/services";
import { brand } from "@/lib/brand";
import { createPageMetadata, routes } from "@/lib/routes";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });

  return createPageMetadata({
    title: t("page.metaTitle", { brand: brand.name }),
    description: t("page.metaDescription", { brand: brand.name }),
    path: routes.services,
  });
}

export default async function ServicesRoute() {
  const t = await getTranslations("common");

  return (
    <>
      <PageBackBar href={routes.home} label={t("backHome")} />
      <Services variant="page" />
    </>
  );
}
