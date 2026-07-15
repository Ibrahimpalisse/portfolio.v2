"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X } from "lucide-react";
import { ContactOpenLink } from "@/components/contact-open-link";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { openLeaveReviewModal } from "@/lib/open-leave-review-modal";
import { homeAnchors, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="px-3 py-2 text-sm text-foreground/70 underline-offset-4 transition-colors hover:text-step-accent hover:underline"
    >
      {label}
    </Link>
  );
}

function NavControls() {
  return (
    <div className="flex h-9 shrink-0 items-center rounded-full border border-border/60 bg-background/70 p-0.5 shadow-sm backdrop-blur-sm">
      <LanguageSwitcher compact embedded />
      <span className="mx-0.5 h-4 w-px shrink-0 bg-border/70" aria-hidden />
      <ThemeToggle embedded />
    </div>
  );
}

export function Navbar() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const links = [
    { label: t("services"), href: `${routes.home}${homeAnchors.services}` },
    { label: t("projects"), href: routes.projects },
    { label: t("about"), href: `${routes.home}${homeAnchors.about}` },
    { label: t("reviews"), href: routes.reviews },
    { label: t("leaveReview"), href: "#", openReview: true },
  ] as const;

  const openReviewModal = useCallback((e?: React.MouseEvent<HTMLAnchorElement>) => {
    openLeaveReviewModal(e);
    setOpen(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4 md:pt-8">
      <div className="relative w-full max-w-5xl">
        <motion.nav
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "flex w-full min-w-0 items-center justify-between gap-2 rounded-full border border-transparent px-3 py-2.5 sm:px-5 sm:py-3 transition-all duration-300",
            scrolled &&
              "border-border bg-card/90 backdrop-blur-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)]"
          )}
        >
          <Link href={routes.home} className="shrink-0 font-semibold">
            <BrandLogo />
          </Link>

          <div className="hidden items-center gap-0.5 lg:flex lg:gap-1">
            {links.map((l) => (
              <NavLink
                key={l.label}
                href={l.href}
                label={l.label}
                onClick={"openReview" in l ? openReviewModal : undefined}
              />
            ))}
          </div>

          <div className="hidden items-center gap-2.5 lg:flex">
            <NavControls />
            <Button asChild size="sm" className="h-9 shrink-0 px-4 text-xs sm:text-sm">
              <ContactOpenLink onOpen={() => setOpen(false)}>
                {t("workTogether")}
              </ContactOpenLink>
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <NavControls />
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 shadow-sm backdrop-blur-sm lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={t("menu")}
              aria-expanded={open}
              aria-controls="mobile-nav-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.nav>

        <AnimatePresence>
          {open && (
            <motion.div
              id="mobile-nav-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur-xl sm:mt-4 lg:hidden"
            >
              <div className="flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    onClick={(e) => {
                      if ("openReview" in l) {
                        openReviewModal(e);
                        return;
                      }
                      setOpen(false);
                    }}
                    className="px-4 py-3 text-foreground/80 underline-offset-4 transition-colors hover:text-step-accent hover:underline"
                  >
                    {l.label}
                  </Link>
                ))}
                <Button asChild className="mt-2 w-full">
                  <ContactOpenLink onOpen={() => setOpen(false)}>
                    {t("workTogether")}
                  </ContactOpenLink>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
