"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { openLeaveReviewModal } from "@/lib/open-leave-review-modal";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { PageBackBar, pageShellClass } from "@/components/page-back-link";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/sections/review-card";
import { reviews } from "@/data/reviews";
import { routes } from "@/lib/routes";
import { paginateReviews, REVIEWS_PAGE_SIZE } from "@/lib/reviews-config";
import { cn } from "@/lib/utils";

export function ReviewsPage() {
  const [page, setPage] = useState(1);
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
          eyebrow="Témoignages"
          title={
            <>
              Tous les <span className="text-gradient">avis</span>
            </>
          }
          subtitle={`${total} avis publiés — ${REVIEWS_PAGE_SIZE} par page.`}
        />

        <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-14 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {items.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.04}>
              <ReviewCard review={r} />
            </Reveal>
          ))}
        </div>

        {totalPages > 1 && (
          <Reveal delay={0.1}>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-foreground/50">
                Page {currentPage} sur {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
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
                            onClick={() => setPage(p)}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
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
              Laisser un avis
              <PenLine className="h-4 w-4" />
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
