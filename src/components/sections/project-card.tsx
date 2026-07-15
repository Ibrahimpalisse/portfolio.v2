"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { isSafeHttpUrl } from "@/lib/review-schema";
import {
  ProjectCardPreview,
  type ProjectItem,
} from "@/components/sections/project-modal";

type ProjectCardProps = {
  project: ProjectItem;
  onOpen: (project: ProjectItem) => void;
  className?: string;
  priority?: boolean;
  /** Évite que le bouton natif bloque le swipe Embla sur mobile. */
  swipeFriendly?: boolean;
};

export function ProjectCard({
  project,
  onOpen,
  className,
  priority,
  swipeFriendly = false,
}: ProjectCardProps) {
  const t = useTranslations("projects");
  const openProject = () => onOpen(project);

  const cardBody = (
    <>
      <ProjectCardPreview
        image={project.images[0].src}
        title={project.title}
        count={project.images.length}
        priority={priority}
        screensLabel={t("screens")}
      />
      <div className="relative p-4 sm:p-6">
        <span className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-step-accent/25 bg-background transition-colors group-hover:border-step-accent group-hover:bg-step-accent group-hover:text-primary-foreground sm:end-4 sm:top-4 sm:h-10 sm:w-10">
          <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <p className="text-xs uppercase tracking-widest text-foreground/50">
          {project.category}
        </p>
        <h3 className="mt-2 pe-10 font-display-serif text-lg font-semibold leading-snug sm:pe-12 sm:text-xl">
          {project.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/55">
          {project.desc}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground/60"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <motion.div
      whileHover={swipeFriendly ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={
        className ??
        "group h-full w-full overflow-hidden rounded-2xl border border-step-accent/20 bg-card/80 backdrop-blur-sm transition-colors hover:border-step-accent/45"
      }
    >
      {swipeFriendly ? (
        <div
          role="button"
          tabIndex={0}
          onClick={openProject}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openProject();
            }
          }}
          className="w-full cursor-pointer text-start"
        >
          {cardBody}
        </div>
      ) : (
        <button type="button" onClick={openProject} className="w-full text-start">
          {cardBody}
        </button>
      )}

      {project.link && isSafeHttpUrl(project.link) && (
        <div className="border-t border-border px-4 py-3 sm:px-6">
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sm text-foreground/55 transition-colors hover:text-foreground"
          >
            {t("seeSite")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </motion.div>
  );
}
