import { Quote } from "lucide-react";
import { AnimatedStarRating } from "@/components/ui/animated-star-rating";
import { GlowCard } from "@/components/ui/glow-card";
import { getReviewInitials, type ReviewItem } from "@/data/reviews";
import { cn } from "@/lib/utils";
export function ReviewCard({
  review,
  className,
}: {
  review: ReviewItem;
  className?: string;
}) {
  const initials = getReviewInitials(review);

  return (
    <GlowCard className={cn("flex h-full flex-col", className)}>
      <Quote className="h-8 w-8 text-step-accent/50" />
      <AnimatedStarRating rating={review.rating} className="mt-3" />      <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/70">
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
  );
}
