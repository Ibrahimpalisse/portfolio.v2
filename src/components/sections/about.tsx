import { getTranslations } from "next-intl/server";
import { brand } from "@/lib/brand";
import { aboutStatsToDisplay } from "@/data/about-stats";
import { getAboutStats } from "@/lib/about/store";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Reveal } from "@/components/ui/reveal";
import { ProcessStepper } from "@/components/ui/process-stepper";

export async function About() {
  const t = await getTranslations("about");
  const stats = aboutStatsToDisplay(await getAboutStats());

  return (
    <section
      id="a-propos"
      className="relative scroll-mt-28 bg-step-surface px-4 py-20 sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-block rounded-full border border-step-accent/30 bg-background/60 px-4 py-1 text-xs font-medium uppercase tracking-widest text-step-accent">
              {t("eyebrow")}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 font-display-serif text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl md:text-5xl">
              {t("title")}{" "}
              <span className="text-gradient">{t("titleHighlight")}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-base leading-relaxed text-foreground/60 sm:mt-5 sm:text-lg">
              {t("p1", { name: brand.name })}
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 text-base leading-relaxed text-foreground/60 sm:mt-4 sm:text-lg">
              {t("p2")}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="mx-auto mt-12 max-w-2xl sm:mt-16 lg:mt-20">
            <ProcessStepper />
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:mt-16 lg:mt-20">
            {stats.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-step-accent/20 bg-background/70 p-4 text-center backdrop-blur-sm transition-colors hover:border-step-accent/40 sm:p-6"
              >
                <div className="font-display-serif text-3xl font-semibold text-gradient sm:text-4xl">
                  <AnimatedNumber
                    value={s.value}
                    decimals={s.decimals}
                    suffix={s.suffix ?? ""}
                  />
                </div>
                <div className="mt-2 text-sm text-foreground/55">
                  {t(`stats.${s.id}`)}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
