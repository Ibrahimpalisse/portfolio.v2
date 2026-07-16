"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/sections/project-card";
import { ProjectCarousel } from "@/components/sections/project-carousel";
import {
  ProjectModal,
  type ProjectItem,
} from "@/components/sections/project-modal";
import { Link } from "@/i18n/navigation";
import type { LocalizedProjectItem } from "@/data/projects";
import { getHomeGridClass, HOME_SECTION_PREVIEW } from "@/lib/home-layout";
import { markHomeForScrollRestore } from "@/lib/lock-body-scroll";
import { routes } from "@/lib/routes";

type ProjectsProps = {
  projects: LocalizedProjectItem[];
};

export function Projects({ projects }: ProjectsProps) {
  const t = useTranslations("projects");
  const [active, setActive] = useState<ProjectItem | null>(null);

  const preview = projects.slice(0, HOME_SECTION_PREVIEW);
  const hasMore = projects.length > HOME_SECTION_PREVIEW;

  return (
    <>
      <section
        id="projets"
        className="relative bg-step-surface py-20 sm:py-24 lg:py-28"
      >
        <div className="px-4 sm:px-6">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={
              <>
                {t("title")} <span className="text-gradient">{t("titleHighlight")}</span>
              </>
            }
            subtitle={t("subtitle")}
          />
        </div>

        <ProjectCarousel
          className="mt-10 md:hidden"
          projects={preview}
          onOpen={setActive}
        />

        <div
          className={`mx-auto mt-10 hidden max-w-6xl gap-4 px-4 sm:mt-14 sm:gap-5 sm:px-6 md:grid lg:mt-16 ${getHomeGridClass(preview.length)}`}
        >
          {preview.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <ProjectCard project={p} onOpen={setActive} priority={i === 0} />
            </Reveal>
          ))}
        </div>

        {hasMore && (
          <Reveal delay={0.15}>
            <div className="mt-10 flex justify-center px-4 sm:mt-12">
              <Button asChild variant="outline" size="lg" className="w-full max-w-sm sm:w-auto">
                <Link href={routes.projects} onClick={markHomeForScrollRestore}>
                  {t("seeMore")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        )}
      </section>

      <ProjectModal project={active} onClose={() => setActive(null)} />
    </>
  );
}
