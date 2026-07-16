"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { openLeaveReviewModal } from "@/lib/open-leave-review-modal";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageBackBar, pageShellClass } from "@/components/page-back-link";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/sections/review-card";
import { ReviewDetailModal } from "@/components/sections/review-detail-modal";
import type { ReviewItem } from "@/data/reviews";
import { routes } from "@/lib/routes";
import { paginateReviews, REVIEWS_PAGE_SIZE } from "@/lib/reviews-config";
import { cn } from "@/lib/utils";

type ReviewsPageProps = {
  reviews: ReviewItem[];
};

export function ReviewsPage({ reviews }: ReviewsPageProps) {
  const t = useTranslations("reviews");
  const [page, setPage] = useState(1);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { items, totalPages, total, page: currentPage } = paginateReviews(
    reviews,
    page
  );

  return (
    <section className="relative overflow-x-clip bg-background pb-20 sm:pb-24 lg:pb-28">
      <PageBackBar href={routes.home} label="Retour à l'accueil" />

      <div className={pageShellClass}>
        <SectionHeading
          className="mt-8"
          eyebrow={t("eyebrow")}
          title={
            <>
              {t("title")} <span className="text-gradient">{t("titleHighlight")}</span>
            </>
          }
          subtitle={`${total} — ${REVIEWS_PAGE_SIZE}/page`}
        />

        <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-14 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {items.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.04}>
              <ReviewCard review={r} onOpen={() => setOpenIndex(i)} />
            </Reveal>
          ))}
        </div>

        {totalPages > 1 && (
          <Reveal delay={0.1}>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-foreground/50">
                {t("page", { current: currentPage, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => {
                    setOpenIndex(null);
                    setPage((p) => Math.max(1, p - 1));
                  }}
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  {t("prev")}
                </Button>
                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                    )
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev !== undefined && p - prev > 1;
                      return (
                        <span key={p} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-1 text-foreground/30">…</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenIndex(null);
                              setPage(p);
                            }}
                            className={cn(
                              "flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm transition-colors",
                              p === currentPage
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-foreground/60 hover:border-foreground/25"
                            )}
                          >
                            {p}
                          </button>
                        </span>
                      );
                    })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                    setOpenIndex(null);
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                >
                  {t("next")}
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          </Reveal>
        )}

        <Reveal delay={0.15}>
          <div className="mt-10 flex justify-center sm:mt-12">
            <Button
              variant="outline"
              size="lg"
              onClick={() => openLeaveReviewModal()}
            >
              {t("leaveReview")}
              <PenLine className="h-4 w-4" />
            </Button>
          </div>
        </Reveal>
      </div>

      <ReviewDetailModal
        reviews={items}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
      />
    </section>
  );
}
