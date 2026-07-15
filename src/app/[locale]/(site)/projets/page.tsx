import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { brand } from "@/lib/brand";
import { createPageMetadata, routes } from "@/lib/routes";

const ProjectsPage = dynamic(
  () => import("@/components/sections/projects-page").then((m) => m.ProjectsPage)
);

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });

  return createPageMetadata({
    title: t("page.metaTitle", { brand: brand.name }),
    description: t("page.metaDescription", { brand: brand.name }),
    path: routes.projects,
  });
}

export default function ProjetsRoute() {
  return <ProjectsPage />;
}
