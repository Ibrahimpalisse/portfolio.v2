"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { BrowserPreview3D } from "@/components/ui/browser-preview-3d";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lockBodyScroll } from "@/lib/lock-body-scroll";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { PROJECT_MODAL_TITLE_ID } from "@/lib/modal-a11y-ids";
import { isSafeHttpUrl } from "@/lib/review-schema";
import { ProjectTypeBadges } from "@/components/sections/project-type-badges";

export type ProjectImage = {
  src: string;
  label?: string;
};

export type ProjectItem = {
  id: string;
  title: string;
  category: string;
  desc: string;
  tags: string[];
  /** Types métier (boutique, vitrine…). */
  businessTypeIds?: string[];
  images: ProjectImage[];
  link?: string;
};

type ProjectModalProps = {
  project: ProjectItem | null;
  onClose: () => void;
};

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const [index, setIndex] = useState(0);
  const unlockScrollRef = useRef<(() => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalA11y(Boolean(project), dialogRef);

  useEffect(() => {
    setIndex(0);
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, project.images.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };

    unlockScrollRef.current = lockBodyScroll();
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [project, onClose]);

  const handleExitComplete = () => {
    unlockScrollRef.current?.();
    unlockScrollRef.current = null;
  };

  const current = project?.images[index];
  const hasMultiple = (project?.images.length ?? 0) > 1;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {project && current && (
        <motion.div
          key={project.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="scrollbar-overlay fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          role="presentation"
        >
          <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-4 md:p-6">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={PROJECT_MODAL_TITLE_ID}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative my-auto w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-background p-4 shadow-2xl sm:rounded-2xl sm:p-6 md:p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={onClose}
                data-modal-initial-focus
                className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground sm:end-4 sm:top-4 sm:h-10 sm:w-10"
                aria-label={tCommon("closeModal")}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 pe-10 sm:mb-6 sm:pe-12">
                <p className="text-xs uppercase tracking-widest text-foreground/50">
                  {project.category}
                </p>
                <h3
                  id={PROJECT_MODAL_TITLE_ID}
                  className="mt-2 text-xl font-bold leading-snug sm:text-2xl md:text-3xl"
                >
                  {project.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/60">
                  {project.desc}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <ProjectTypeBadges
                    businessTypeIds={project.businessTypeIds}
                    tags={project.tags}
                    className="mt-0"
                  />
                  {project.link && isSafeHttpUrl(project.link) && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground/60 transition-colors hover:border-foreground/25 hover:text-foreground"
                    >
                      {t("seeSite")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-xl overflow-hidden px-1 py-2 sm:max-w-2xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${project.id}-${index}`}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <BrowserPreview3D
                      image={current.src}
                      title={`${project.title} — ${current.label ?? index + 1}`}
                      className="mx-auto"
                    />
                  </motion.div>
                </AnimatePresence>

                {hasMultiple && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                      disabled={index === 0}
                      className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md transition-opacity disabled:opacity-30 sm:left-3"
                      aria-label={t("prevImage")}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setIndex((i) =>
                          Math.min(i + 1, project.images.length - 1)
                        )
                      }
                      disabled={index === project.images.length - 1}
                      className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md transition-opacity disabled:opacity-30 sm:right-3"
                      aria-label={t("nextImage")}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {hasMultiple && (
                <div className="mt-5 flex flex-col items-center gap-4">
                  {current.label && (
                    <p className="text-sm font-medium text-foreground/70">
                      {current.label}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    {project.images.map((img, i) => (
                      <button
                        key={img.src + i}
                        type="button"
                        onClick={() => setIndex(i)}
                        aria-label={img.label ?? t("goToImage", { index: i + 1 })}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          i === index
                            ? "w-6 bg-foreground"
                            : "w-2 bg-foreground/25 hover:bg-foreground/40"
                        )}
                      />
                    ))}
                  </div>

                  <div className="scrollbar-overlay flex gap-2 overflow-x-auto pb-1">
                    {project.images.map((img, i) => (
                      <button
                        key={img.src + i}
                        type="button"
                        onClick={() => setIndex(i)}
                        className={cn(
                          "relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-16 sm:w-28",
                          i === index
                            ? "border-foreground"
                            : "border-border opacity-60 hover:opacity-100"
                        )}
                      >
                        <Image
                          src={img.src}
                          alt={img.label ?? t("thumbnail", { index: i + 1 })}
                          fill
                          className="object-cover object-top"
                          sizes="112px"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {project.link && isSafeHttpUrl(project.link) && (
                <div className="mt-6 flex justify-center sm:mt-8">
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("seeSite")} <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ProjectCardPreview({
  image,
  title,
  count,
  priority = false,
  screensLabel = "screens",
}: {
  image: string;
  title: string;
  count?: number;
  priority?: boolean;
  screensLabel?: string;
}) {
  return (
    <div className="relative h-44 overflow-hidden bg-muted perspective-[800px] sm:h-52 md:h-56">
      {count && count > 1 && (
        <span className="absolute right-6 top-6 z-10 rounded-full border border-border bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground/60">
          +<AnimatedNumber value={count} duration={800} /> {screensLabel}
        </span>
      )}
      <motion.div
        className="absolute inset-4 rounded-lg border border-border bg-card shadow-md"
        whileHover={{
          rotateX: 8,
          rotateY: -8,
          scale: 1.02,
          transition: { type: "spring", stiffness: 260, damping: 20 },
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="flex gap-1 border-b border-border bg-muted/50 px-2 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
        </div>
        <div className="relative aspect-[16/10] w-full">
          <Image
            src={image}
            alt={title}
            fill
            priority={priority}
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 500px"
          />
        </div>
      </motion.div>
    </div>
  );
}
