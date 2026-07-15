"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type AnimatedStarRatingProps = {
  rating: number;
  className?: string;
  starClassName?: string;
  delay?: number;
};

export function AnimatedStarRating({
  rating,
  className,
  starClassName,
  delay = 0,
}: AnimatedStarRatingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const reduceMotion = useReducedMotion();
  const safeRating = Math.min(5, Math.max(0, Math.round(rating)));
  const [filled, setFilled] = useState(reduceMotion ? safeRating : 0);

  useEffect(() => {
    if (reduceMotion) {
      setFilled(safeRating);
      return;
    }

    if (!inView) return;

    setFilled(0);
    let current = 0;
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        current += 1;
        setFilled(current);
        if (current >= safeRating) {
          window.clearInterval(interval);
        }
      }, 160);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, [inView, safeRating, reduceMotion, delay]);

  return (
    <div ref={ref} className={cn("flex gap-1", className)} aria-label={`${safeRating} sur 5 étoiles`}>
      {[1, 2, 3, 4, 5].map((value) => {
        const active = value <= filled;

        return (
          <motion.span
            key={value}
            initial={reduceMotion ? false : { scale: 0.5, opacity: 0.25 }}
            animate={
              active
                ? { scale: 1, opacity: 1 }
                : { scale: 0.85, opacity: 0.35 }
            }
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Star
              className={cn(
                "h-4 w-4",
                active
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-foreground/15",
                starClassName
              )}
              aria-hidden
            />
          </motion.span>
        );
      })}
    </div>
  );
}
