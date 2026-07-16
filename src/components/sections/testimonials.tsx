"use client";

import { useState } from "react";
import { PenLine, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { openLeaveReviewModal } from "@/lib/open-leave-review-modal";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/sections/review-card";
import { ReviewDetailModal } from "@/components/sections/review-detail-modal";
import { Link } from "@/i18n/navigation";
import type { ReviewItem } from "@/data/reviews";
import { getHomeGridClass, HOME_SECTION_PREVIEW } from "@/lib/home-layout";
import { markHomeForScrollRestore } from "@/lib/lock-body-scroll";
import { routes } from "@/lib/routes";

type TestimonialsProps = {
  reviews: ReviewItem[];
};

export function Testimonials({ reviews }: TestimonialsProps) {
  const t = useTranslations("reviews");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const preview = reviews.slice(0, HOME_SECTION_PREVIEW);
  const hasMore = reviews.length > HOME_SECTION_PREVIEW;

  const subtitle =
    reviews.length === 0 ? (
      t("empty")
    ) : reviews.length === 1 ? (
      t("one")
    ) : (
      <>
        <AnimatedNumber value={reviews.length} duration={900} />{" "}
        {t("many", { suffix: hasMore ? t("previewSuffix") : "" })}
      </>
    );

  return (
    <section
      id="avis"
      className="relative bg-step-surface px-4 py-20 sm:px-6 sm:py-24 lg:py-28"
    >
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={
          <>
            {t("title")} <span className="text-gradient">{t("titleHighlight")}</span>
          </>
        }
        subtitle={subtitle}
      />

      {reviews.length === 0 ? (
        <Reveal>
          <p className="mx-auto mt-10 max-w-md text-center text-sm text-foreground/50 sm:mt-14">
            {t("nonePublished")}
          </p>
        </Reveal>
      ) : (
        <div
          className={`mx-auto mt-10 grid max-w-6xl gap-5 sm:mt-14 lg:mt-16 ${getHomeGridClass(preview.length)}`}
        >
          {preview.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.08}>
              <ReviewCard review={r} onOpen={() => setOpenIndex(i)} />
            </Reveal>
          ))}
        </div>
      )}

      <Reveal delay={0.12}>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:mt-12 sm:flex-row">
          {hasMore && (
            <Button asChild variant="default" size="lg" className="w-full max-w-sm sm:w-auto">
              <Link href={routes.reviews} onClick={markHomeForScrollRestore}>
                {t("seeMore")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            className="w-full max-w-sm sm:w-auto"
            onClick={() => openLeaveReviewModal()}
          >
            {t("leaveReview")}
            <PenLine className="h-4 w-4" />
          </Button>
        </div>
      </Reveal>

      <ReviewDetailModal
        reviews={preview}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
      />
    </section>
  );
}
