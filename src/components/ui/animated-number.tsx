"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

function formatValue(value: number, decimals: number, decimalSeparator: string) {
  if (decimals <= 0) return String(Math.round(value));

  const fixed = value.toFixed(decimals);
  return decimalSeparator === "," ? fixed.replace(".", ",") : fixed;
}

export type AnimatedNumberProps = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  decimalSeparator?: string;
  duration?: number;
  delay?: number;
  /** Re-animate from 0 when value changes (e.g. carousel index). */
  animateOnChange?: boolean;
  className?: string;
};

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  decimalSeparator = ",",
  duration = 1200,
  delay = 0,
  animateOnChange = false,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: !animateOnChange, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    if (!inView && !animateOnChange) return;

    const shouldRun = animateOnChange || !hasAnimatedRef.current;
    if (!shouldRun) return;

    hasAnimatedRef.current = true;
    setDisplay(0);

    let raf = 0;
    let start: number | null = null;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start - delay;

      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;

      if (progress >= 1) {
        setDisplay(value);
        return;
      }

      const next =
        decimals > 0
          ? value * eased
          : Math.round(value * eased);

      setDisplay(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, delay, decimals, reduceMotion, animateOnChange]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatValue(display, decimals, decimalSeparator)}
      {suffix}
    </span>
  );
}
