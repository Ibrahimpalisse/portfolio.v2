"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Quote, X } from "lucide-react";
import { AnimatedStarRating } from "@/components/ui/animated-star-rating";
import { getReviewInitials, type ReviewItem } from "@/data/reviews";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { lockBodyScroll } from "@/lib/lock-body-scroll";

type ReviewDetailModalProps = {
  reviews: ReviewItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ReviewDetailModal({
  reviews,
  index,
  onClose,
  onIndexChange,
}: ReviewDetailModalProps) {
  const t = useTranslations("reviews");
  const tCommon = useTranslations("common");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const unlockScrollRef = useRef<(() => void) | null>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  const open = index !== null && reviews.length > 0;
  const safeIndex =
    open && index !== null
      ? Math.min(Math.max(index, 0), reviews.length - 1)
      : 0;
  const review = open ? reviews[safeIndex] : null;
  const hasMultiple = reviews.length > 1;

  useModalA11y(open, dialogRef);

  useEffect(() => {
    if (!open) return;

    unlockScrollRef.current = lockBodyScroll();
    return () => {
      unlockScrollRef.current?.();
      unlockScrollRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (reviews.length <= 1) return;
      const current = indexRef.current;
      if (current === null) return;
      if (e.key === "ArrowRight") {
        onIndexChange((current + 1) % reviews.length);
      }
      if (e.key === "ArrowLeft") {
        onIndexChange((current - 1 + reviews.length) % reviews.length);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, reviews.length, onClose, onIndexChange]);

  function goPrev() {
    if (!hasMultiple) return;
    onIndexChange((safeIndex - 1 + reviews.length) % reviews.length);
  }

  function goNext() {
    if (!hasMultiple) return;
    onIndexChange((safeIndex + 1) % reviews.length);
  }

  return (
    <AnimatePresence>
      {open && review && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            key={review.id}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative my-auto flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-modal-initial-focus
              onClick={onClose}
              className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground"
              aria-label={tCommon("closeModal")}
            >
              <X className="h-4 w-4" />
            </button>

            <article className="flex min-h-0 flex-1 flex-col gap-4 pe-8">
              <header className="shrink-0">
                <Quote className="h-7 w-7 text-step-accent/50" aria-hidden />
                <AnimatedStarRating rating={review.rating} className="mt-3" />
                <p className="mt-2 text-xs text-foreground/45">
                  {t("detailCounter", {
                    current: safeIndex + 1,
                    total: reviews.length,
                  })}
                </p>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <p className="break-words text-sm leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
                  &ldquo;{review.text}&rdquo;
                </p>
              </div>

              <footer className="flex shrink-0 items-center gap-3 border-t border-border pt-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-step-accent/15 text-xs font-semibold text-step-accent">
                  {getReviewInitials(review)}
                </div>
                <div className="min-w-0">
                  <p id={titleId} className="truncate text-sm font-medium">
                    {review.name}
                  </p>
                  {review.role ? (
                    <p className="truncate text-xs text-foreground/50 [overflow-wrap:anywhere]">
                      {review.role}
                    </p>
                  ) : null}
                </div>
              </footer>

              {hasMultiple && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:text-foreground"
                    aria-label={t("prevReview")}
                  >
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                    {t("prev")}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-foreground/70 transition-colors hover:text-foreground"
                    aria-label={t("nextReview")}
                  >
                    {t("next")}
                    <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                  </button>
                </div>
              )}
            </article>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
