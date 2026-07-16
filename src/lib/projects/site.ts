import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  projectCatalog,
  type LocalizedProjectItem,
  type ProjectCategoryKey,
} from "@/data/projects";
import {
  getPublishedProjects,
  listPublishedProjectRows,
} from "@/lib/projects/store";

async function categoryLabels(
  locale: Locale
): Promise<Record<ProjectCategoryKey, string>> {
  const t = await getTranslations({ locale, namespace: "projects" });
  return {
    personal: t("categories.personal"),
    sold: t("categories.sold"),
  };
}

function localizeDemo(
  locale: Locale,
  labels: Record<ProjectCategoryKey, string>,
  tItems: Awaited<ReturnType<typeof getTranslations>>
): LocalizedProjectItem[] {
  return projectCatalog.map((project) => ({
    id: project.id,
    categoryKey: project.categoryKey,
    title: tItems(`items.${project.id}.title`),
    category: labels[project.categoryKey],
    desc: tItems(`items.${project.id}.desc`),
    tags: [],
    businessTypeIds: project.businessTypeIds,
    images: project.images.map((image) => ({
      src: image.src,
      label: tItems(`items.${project.id}.images.${image.labelKey}`),
    })),
    link: project.link,
  }));
}

/**
 * Projets publiés BDD, sinon catalogue démo localisé.
 */
export async function getSiteProjects(
  locale: Locale
): Promise<LocalizedProjectItem[]> {
  const labels = await categoryLabels(locale);
  const fromDb = await getPublishedProjects(locale, labels);
  if (fromDb.length > 0) return fromDb;

  const tItems = await getTranslations({ locale, namespace: "projects" });
  return localizeDemo(locale, labels, tItems);
}

/** true si le site sert la BDD (au moins 1 publié). */
export async function siteProjectsFromDatabase(): Promise<boolean> {
  const rows = await listPublishedProjectRows();
  return Boolean(rows && rows.length > 0);
}
