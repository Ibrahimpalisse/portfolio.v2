"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowDown } from "lucide-react";
import { ContactOpenLink } from "@/components/contact-open-link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { TechStrip } from "@/components/sections/tech-strip";
import { HeroTypewriter } from "@/components/sections/hero-typewriter";
import { HeroBanner3D } from "@/components/sections/hero-banner-3d";
import { Link } from "@/i18n/navigation";
import { homeAnchors, routes } from "@/lib/routes";

const enterEase = [0.22, 1, 0.36, 1] as const;

export function HomeSection() {
  const t = useTranslations("home");
  const reduceMotion = useReducedMotion();
  const [heroReady, setHeroReady] = useState(false);

  const enterTransition = {
    duration: reduceMotion ? 0.2 : 0.6,
    ease: enterEase,
  };

  return (
    <section
      id="accueil"
      className="relative flex min-h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-clip bg-background"
    >
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-28">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12 xl:gap-16">
          <div className="relative flex w-full flex-col items-center lg:items-start rtl:lg:items-end">
            <div className="relative w-full max-w-xl lg:max-w-none">
              <HeroTypewriter onComplete={() => setHeroReady(true)} />
            </div>

            <motion.div
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 28, filter: "blur(6px)" }
              }
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, filter: "blur(0px)" }
              }
              transition={{
                ...enterTransition,
                delay: reduceMotion ? 0 : 0.55,
              }}
              className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start rtl:lg:justify-end"
            >
              <Button asChild size="lg" className="w-full sm:w-auto">
                <ContactOpenLink>{t("contact")}</ContactOpenLink>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href={routes.projects}>{t("projects")}</Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12, ease: enterEase }}
            className="relative mx-auto w-full max-w-2xl overflow-visible lg:mx-0 lg:max-w-none"
          >
            <HeroBanner3D />
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={
            heroReady
              ? reduceMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0 }
              : undefined
          }
          transition={{ ...enterTransition, delay: reduceMotion ? 0 : 0.12 }}
        >
          <a
            href={homeAnchors.services}
            className="mx-auto mt-10 flex flex-col items-center gap-1 text-foreground/40 transition-colors hover:text-foreground sm:mt-12"
            aria-label={t("scroll")}
          >
            <span className="text-xs uppercase tracking-widest">{t("scroll")}</span>
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </a>
        </motion.div>
      </div>

      <Reveal delay={0.1}>
        <TechStrip />
      </Reveal>
    </section>
  );
}
