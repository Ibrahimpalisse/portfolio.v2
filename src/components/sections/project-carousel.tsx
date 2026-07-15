"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ProjectCard } from "@/components/sections/project-card";
import type { ProjectItem } from "@/components/sections/project-modal";
import { getLocaleDirection, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type ProjectCarouselProps = {
  projects: ProjectItem[];
  onOpen: (project: ProjectItem) => void;
  className?: string;
};

export function ProjectCarousel({ projects, onOpen, className }: ProjectCarouselProps) {
  const t = useTranslations("projects");
  const locale = useLocale() as Locale;
  const direction = getLocaleDirection(locale);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    containScroll: "trimSnaps",
    direction,
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const dragged = useRef(false);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onPointerDown = () => {
      dragged.current = false;
    };
    const onScroll = () => {
      dragged.current = true;
    };

    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("scroll", onScroll);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("scroll", onScroll);
    };
  }, [emblaApi, onSelect]);

  const handleOpen = useCallback(
    (project: ProjectItem) => {
      if (dragged.current) return;
      onOpen(project);
    },
    [onOpen]
  );

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit({ direction });
  }, [emblaApi, direction]);

  if (projects.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div
        className="overflow-hidden px-4 select-none sm:px-6"
        ref={emblaRef}
        style={{ touchAction: "manipulation" }}
      >
        <div className="-ms-4 flex sm:-ms-6">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="min-w-0 shrink-0 grow-0 basis-[88%] ps-4 sm:basis-[78%] sm:ps-6"
            >
              <ProjectCard
                project={project}
                onOpen={handleOpen}
                priority={index === 0}
                swipeFriendly
              />
            </div>
          ))}
        </div>
      </div>

      {projects.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-opacity disabled:opacity-30"
            aria-label={t("prevProject")}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </button>

          <div className="flex items-center gap-2">
            {projects.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={t("goToProject", { index: index + 1 })}
                aria-current={index === selectedIndex ? "true" : undefined}
                onClick={() => scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === selectedIndex
                    ? "w-6 bg-foreground"
                    : "w-2 bg-foreground/25 hover:bg-foreground/40"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-opacity disabled:opacity-30"
            aria-label={t("nextProject")}
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-foreground/40">
        {t("swipeHint")}
      </p>
    </div>
  );
}
