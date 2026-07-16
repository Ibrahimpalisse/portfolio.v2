"use client";

import { Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimatedStarRating } from "@/components/ui/animated-star-rating";
import { GlowCard } from "@/components/ui/glow-card";
import { getReviewInitials, type ReviewItem } from "@/data/reviews";
import { cn } from "@/lib/utils";

type ReviewCardProps = {
  review: ReviewItem;
  className?: string;
  onOpen?: () => void;
};

export function ReviewCard({ review, className, onOpen }: ReviewCardProps) {
  const t = useTranslations("reviews");
  const initials = getReviewInitials(review);

  return (
    <div className={cn("relative h-full", className)}>
      <GlowCard className="flex h-full flex-col">
        <Quote className="h-8 w-8 text-step-accent/50" aria-hidden />
        <AnimatedStarRating rating={review.rating} className="mt-3" />
        <p className="mt-4 line-clamp-5 flex-1 break-words text-sm leading-relaxed text-foreground/70 [overflow-wrap:anywhere]">
          &ldquo;{review.text}&rdquo;
        </p>
        <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-step-accent/15 text-xs font-semibold text-step-accent">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{review.name}</div>
            <div className="truncate text-xs text-foreground/50">{review.role}</div>
          </div>
        </div>
      </GlowCard>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="absolute inset-0 z-20 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          aria-label={t("openReview", { name: review.name })}
        />
      ) : null}
    </div>
  );
}
