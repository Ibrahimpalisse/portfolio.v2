"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
  error?: string;
  id?: string;
};

export function StarRating({ value, onChange, error, id = "review-rating" }: StarRatingProps) {
  const t = useTranslations("reviewForm");

  return (
    <div
      className={cn(
        "w-full rounded-xl border bg-background/50 px-4 py-4 transition-colors",
        error ? "border-red-500" : "border-border"
      )}
    >
      <p id={`${id}-label`} className="text-sm font-medium text-foreground/75">
        {t("rating")} <span className="text-primary">*</span>
      </p>
      <div
        className="mt-2 flex gap-1"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <StarRatingButton
            key={star}
            selected={value >= star}
            checked={value === star}
            onSelect={() => onChange(star)}
            ariaLabel={t("starAria", { count: star })}
          />
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function StarRatingButton({
  selected,
  checked,
  onSelect,
  ariaLabel,
}: {
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      aria-label={ariaLabel}
      className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Star
        className={cn(
          "h-7 w-7 transition-colors sm:h-8 sm:w-8",
          selected ? "fill-yellow-400 text-yellow-400" : "text-foreground/20"
        )}
      />
    </button>
  );
}
