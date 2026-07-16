"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  projectCatalog,
  getProjectCategoryKeys,
  type LocalizedProjectItem,
  type ProjectCategoryKey,
} from "@/data/projects";

/** Fallback client-only (démo). Préférer getSiteProjects côté serveur. */
export function useLocalizedProjects(): LocalizedProjectItem[] {
  const t = useTranslations("projects");

  return useMemo(
    () =>
      projectCatalog.map((project) => ({
        id: project.id,
        categoryKey: project.categoryKey,
        title: t(`items.${project.id}.title`),
        category: t(`categories.${project.categoryKey}`),
        desc: t(`items.${project.id}.desc`),
        tags: [],
        businessTypeIds: project.businessTypeIds,
        images: project.images.map((image) => ({
          src: image.src,
          label: t(`items.${project.id}.images.${image.labelKey}`),
        })),
        link: project.link,
      })),
    [t]
  );
}

export function useProjectCategoryFilters() {
  const t = useTranslations("projects");

  return useMemo(
    () => [
      { key: "all" as const, label: t("all") },
      ...getProjectCategoryKeys().map((key: ProjectCategoryKey) => ({
        key,
        label: t(`categories.${key}`),
      })),
    ],
    [t]
  );
}
