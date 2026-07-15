"use client";

import { Compass, Layers, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

const processSteps = [
  { number: 1, Icon: Compass, key: "step1" as const },
  { number: 2, Icon: Layers, key: "step2" as const },
  { number: 3, Icon: Rocket, key: "step3" as const },
] as const;

type ProcessStepperProps = {
  className?: string;
};

export function ProcessStepper({ className }: ProcessStepperProps) {
  const t = useTranslations("process");

  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute bottom-4 left-[1.125rem] top-4 w-px bg-step-accent/50 sm:left-[1.375rem] rtl:left-auto rtl:right-[1.125rem] rtl:sm:right-[1.375rem]"
        aria-hidden
      />

      <ol className="space-y-10 sm:space-y-12">
        {processSteps.map((step) => (
          <li key={step.number} className="relative pl-12 sm:pl-14 rtl:pl-0 rtl:pr-12 rtl:sm:pr-14">
            <span
              className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-step-accent/70 bg-step-surface font-display-serif text-lg font-semibold text-foreground sm:h-11 sm:w-11 sm:text-xl rtl:left-auto rtl:right-0"
              aria-hidden
            >
              <AnimatedNumber
                value={step.number}
                delay={(step.number - 1) * 120}
                duration={700}
                className="font-display-serif text-lg font-semibold sm:text-xl"
              />
            </span>

            <div className="flex gap-3 pt-0.5 sm:gap-4">
              <step.Icon
                className="mt-1 h-5 w-5 shrink-0 text-step-accent sm:h-[1.35rem] sm:w-[1.35rem]"
                strokeWidth={1.5}
                aria-hidden
              />
              <div className="min-w-0">
                <h3 className="font-display-serif text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl md:text-[1.65rem]">
                  {t(`${step.key}.title`)}
                </h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-foreground/60 sm:mt-4 sm:text-base">
                  {t(`${step.key}.desc`)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
