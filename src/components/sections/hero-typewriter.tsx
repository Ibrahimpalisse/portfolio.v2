"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { BrandName } from "@/components/brand-name";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const CHAR_MS = 42;
const LINE_PAUSE_MS = 520;

function TypewriterCursor({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block w-[2px] animate-pulse bg-step-accent align-middle"
      style={{ height: "0.85em" }}
    />
  );
}

function HeroTextGhost({ tagline, bio }: { tagline: string; bio: string }) {
  return (
    <div
      className="pointer-events-none invisible flex select-none flex-col items-center text-center lg:items-start lg:text-left rtl:lg:items-end rtl:lg:text-right"
      aria-hidden
    >
      <div className="mb-2 sm:mb-4">
        <BrandName className="pb-0.5 text-[1.65rem] leading-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]" />
      </div>
      <h1 className="font-display-serif text-[1.75rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
        <span className="text-gradient">{tagline}</span>
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/60 sm:mt-6 sm:text-lg">
        {bio}
      </p>
    </div>
  );
}

type HeroTypewriterProps = {
  onComplete?: () => void;
};

export function HeroTypewriter({ onComplete }: HeroTypewriterProps = {}) {
  const t = useTranslations("hero");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const tagline = t("tagline");
  const bio = t("bio");
  const lines = useMemo(() => [brand.name, tagline, bio], [tagline, bio]);

  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    setLineIndex(0);
    setCharIndex(0);
    setDone(false);
    completedRef.current = false;
  }, [locale, tagline, bio]);

  useEffect(() => {
    if (reduceMotion) {
      if (!completedRef.current) {
        completedRef.current = true;
        setDone(true);
        onCompleteRef.current?.();
      }
      return;
    }

    if (lineIndex >= lines.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        setDone(true);
        onCompleteRef.current?.();
      }
      return;
    }

    const current = lines[lineIndex];

    if (charIndex < current.length) {
      const delay = CHAR_MS + (Math.random() > 0.82 ? 80 : 0);
      const timer = window.setTimeout(() => setCharIndex((c) => c + 1), delay);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setLineIndex((i) => i + 1);
      setCharIndex(0);
    }, LINE_PAUSE_MS);

    return () => window.clearTimeout(timer);
  }, [lineIndex, charIndex, lines, reduceMotion]);

  if (reduceMotion) {
    return (
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left rtl:lg:items-end rtl:lg:text-right">
        <div className="mb-2 sm:mb-4">
          <BrandName className="pb-0.5 text-[1.65rem] leading-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]" />
        </div>
        <h1 className="font-display-serif text-[1.75rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="text-gradient">{tagline}</span>
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/60 sm:mt-6 sm:text-lg">
          {bio}
        </p>
      </div>
    );
  }

  const nameLen = lineIndex > 0 ? brand.name.length : charIndex;
  const typedTagline =
    lineIndex > 1 ? lines[1] : lineIndex === 1 ? lines[1].slice(0, charIndex) : "";
  const typedBio =
    lineIndex > 2 ? lines[2] : lineIndex === 2 ? lines[2].slice(0, charIndex) : "";

  const typing = !done;

  return (
    <div className="relative w-full">
      <HeroTextGhost tagline={tagline} bio={bio} />

      <div
        aria-live="polite"
        className={cn(
          "absolute inset-0 flex flex-col items-center text-center lg:items-start lg:text-left rtl:lg:items-end rtl:lg:text-right"
        )}
      >
        <div className="mb-2 sm:mb-4">
          <BrandName className="pb-0.5 text-[1.65rem] leading-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]" length={nameLen} />
          <TypewriterCursor active={typing && lineIndex === 0} />
        </div>

        <h1 className="font-display-serif text-[1.75rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          {lineIndex >= 1 && (
            <>
              <span className="text-gradient">{typedTagline}</span>
              <TypewriterCursor active={typing && lineIndex === 1} />
            </>
          )}
        </h1>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/60 sm:mt-6 sm:text-lg">
          {lineIndex >= 2 && (
            <>
              {typedBio}
              <TypewriterCursor active={typing && lineIndex === 2} />
            </>
          )}
        </p>
      </div>
    </div>
  );
}
