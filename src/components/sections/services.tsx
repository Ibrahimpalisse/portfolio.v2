"use client";

import {
  Code2,
  Palette,
  Server,
  Smartphone,
  Search,
  Rocket,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";
import { GlowCard } from "@/components/ui/glow-card";

const serviceKeys = ["web", "backend", "design", "mobile", "seo", "maintenance"] as const;
const serviceIcons = {
  web: Code2,
  backend: Server,
  design: Palette,
  mobile: Smartphone,
  seo: Search,
  maintenance: Rocket,
} as const;

export function Services({ variant = "section" }: { variant?: "section" | "page" } = {}) {
  const t = useTranslations("services");
  const HeadingTag = variant === "page" ? "h1" : "h2";

  return (
    <section
      id="services"
      className="relative bg-step-surface px-4 py-20 sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-block rounded-full border border-step-accent/30 bg-background/60 px-4 py-1 text-xs font-medium uppercase tracking-widest text-step-accent">
              {t("eyebrow")}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <HeadingTag className="mt-4 font-display-serif text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl md:text-5xl">
              {t("title")}{" "}
              <span className="text-gradient">{t("titleHighlight")}</span>
            </HeadingTag>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-base leading-relaxed text-foreground/60 sm:mt-5 sm:text-lg">
              {t("subtitle")}
            </p>
          </Reveal>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-5 lg:mt-20 lg:grid-cols-3">
          {serviceKeys.map((key, i) => {
            const Icon = serviceIcons[key];
            return (
              <Reveal key={key} delay={0.12 + i * 0.05}>
                <GlowCard className="h-full border-step-accent/20 bg-background/70 backdrop-blur-sm hover:border-step-accent/40">
                  <div className="flex items-start gap-4 sm:block">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-step-accent/30 bg-background/60 text-step-accent sm:h-12 sm:w-12">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1 sm:mt-5 sm:flex-none">
                      <h3 className="font-display-serif text-xl font-semibold leading-snug sm:text-2xl">
                        {t(`items.${key}.title`)}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/60 sm:mt-3 sm:text-base">
                        {t(`items.${key}.desc`)}
                      </p>
                    </div>
                  </div>
                </GlowCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
