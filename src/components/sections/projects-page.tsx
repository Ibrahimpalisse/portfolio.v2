"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageBackBar, pageShellClass } from "@/components/page-back-link";
import { ProjectCard } from "@/components/sections/project-card";
import {
  ProjectModal,
  type ProjectItem,
} from "@/components/sections/project-modal";
import {
  useLocalizedProjects,
  useProjectCategoryFilters,
} from "@/hooks/use-localized-projects";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ProjectCategoryKey } from "@/data/projects";

type FilterKey = "all" | ProjectCategoryKey;

export function ProjectsPage() {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const [active, setActive] = useState<ProjectItem | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const projects = useLocalizedProjects();
  const categories = useProjectCategoryFilters();

  const filtered = useMemo(
    () =>
      filter === "all"
        ? projects
        : projects.filter((project) => project.categoryKey === filter),
    [filter, projects]
  );

  return (
    <>
      <section className="relative overflow-x-clip bg-background pb-20 sm:pb-24 lg:pb-28">
        <PageBackBar href={routes.home} label={tCommon("backHome")} />

        <div className={pageShellClass}>
          <SectionHeading
            className="mt-8"
            eyebrow={t("page.eyebrow")}
            title={
              <>
                {t("page.title")}{" "}
                <span className="text-gradient">{t("page.titleHighlight")}</span>
              </>
            }
            subtitle={t("page.subtitle")}
          />

          <Reveal delay={0.12}>
            <div className="mt-8 flex flex-wrap justify-center gap-2 sm:mt-10 md:mt-12">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setFilter(cat.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors sm:px-4 sm:py-2 sm:text-sm",
                    filter === cat.key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground/60 hover:border-foreground/25 hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-14 sm:grid-cols-2 lg:mt-16">
            {filtered.map((project, index) => (
              <Reveal key={project.id} delay={index * 0.06}>
                <ProjectCard project={project} onOpen={setActive} priority={index === 0} />
              </Reveal>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="mt-12 text-center text-foreground/50">{t("empty")}</p>
          )}
        </div>
      </section>

      <ProjectModal project={active} onClose={() => setActive(null)} />
    </>
  );
}
