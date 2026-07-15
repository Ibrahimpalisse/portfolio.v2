import { Mail } from "lucide-react";
import {
  SiDiscord,
  SiWhatsapp,
  SiInstagram,
  SiTiktok,
} from "react-icons/si";
import { getTranslations } from "next-intl/server";
import { BrandLogoFooter } from "@/components/brand-logo";
import { FooterContactButton } from "@/components/footer-contact-button";
import { FooterContactLink } from "@/components/footer-contact-link";
import { FooterLeaveReviewLink } from "@/components/footer-leave-review-link";
import { Link } from "@/i18n/navigation";
import { brand, getFooterSocials, type FooterSocialId } from "@/lib/brand";
import { homeAnchors, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const socialIcons: Record<
  FooterSocialId,
  React.ComponentType<{ className?: string }>
> = {
  discord: SiDiscord,
  whatsapp: SiWhatsapp,
  instagram: SiInstagram,
  tiktok: SiTiktok,
};

const footerLinkClass =
  "text-sm text-foreground/65 underline-offset-4 transition-colors hover:text-step-accent hover:underline";

const iconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-step-accent/20 bg-background/60 text-foreground/55 transition-colors";

function FooterColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-widest text-step-accent">
      {children}
    </p>
  );
}

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tMeta = await getTranslations("meta");
  const socials = getFooterSocials();
  const year = new Date().getFullYear();

  const navLinks = [
    { label: tNav("services"), href: `${routes.home}${homeAnchors.services}` },
    { label: tNav("projects"), href: routes.projects },
    { label: tNav("about"), href: `${routes.home}${homeAnchors.about}` },
    { label: tNav("reviews"), href: routes.reviews },
  ];

  return (
    <footer className="border-t border-step-accent/20 bg-step-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-5">
            <Link href={routes.home} className="w-fit shrink-0">
              <BrandLogoFooter />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-foreground/60">
              {tMeta("description")}
            </p>
            <FooterContactButton />
          </div>

          <div className="lg:col-span-3">
            <FooterColumnTitle>{t("navigation")}</FooterColumnTitle>
            <ul className="mt-4 space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <FooterContactLink />
              </li>
              <li>
                <FooterLeaveReviewLink />
              </li>
            </ul>
          </div>

          <div className="lg:col-span-4">
            <FooterColumnTitle>{t("contact")}</FooterColumnTitle>
            <div className="mt-4 space-y-4">
              <p className="text-sm text-foreground/60">{t("preferredContact")}</p>
              <a
                href={`mailto:${brand.email}`}
                className={cn(
                  footerLinkClass,
                  "inline-flex items-center gap-2 no-underline hover:underline"
                )}
              >
                <Mail className="h-4 w-4 shrink-0 text-step-accent" aria-hidden />
                {brand.email}
              </a>

              <div>
                <p className="mb-3 text-xs text-foreground/45">{t("networks")}</p>
                <div className="flex flex-wrap gap-2">
                  {socials.map((s) => {
                    const Icon = socialIcons[s.id];
                    const active = s.href.length > 0;

                    const className = cn(
                      iconButtonClass,
                      active &&
                        "hover:border-step-accent/50 hover:bg-step-accent/10 hover:text-step-accent",
                      s.preferred &&
                        active &&
                        "border-step-accent/35 bg-step-accent/10 text-step-accent",
                      !active && "cursor-not-allowed opacity-35"
                    );

                    if (!active) {
                      return (
                        <span
                          key={s.id}
                          aria-label={t("socialSoon", { label: s.label })}
                          title={t("socialConfig", { label: s.label })}
                          className={className}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                      );
                    }

                    return (
                      <a
                        key={s.id}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        title={s.label}
                        className={className}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-step-accent/15 pt-6 sm:flex-row sm:items-center">
          <p className="text-center text-xs text-foreground/45 sm:text-left sm:text-sm">
            © {year} {brand.name}. {t("rights")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href={routes.legal} className={footerLinkClass}>
              {t("legal")}
            </Link>
            <a
              href={brand.siteUrl}
              className={footerLinkClass}
              target="_blank"
              rel="noopener noreferrer"
            >
              {brand.siteUrl.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
