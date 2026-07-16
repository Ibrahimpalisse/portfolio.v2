import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { PageBackBar } from "@/components/page-back-link";
import { brand } from "@/lib/brand";
import { createPageMetadata, routes } from "@/lib/routes";
import { getPublicContactEmail } from "@/lib/social/store";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const linkClass = "text-primary hover:underline";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legalPage" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription", { brand: brand.name }),
    path: routes.legal,
  });
}

export default async function MentionsLegalesPage() {
  const t = await getTranslations("legalPage");
  const tCommon = await getTranslations("common");
  const contactEmail = await getPublicContactEmail();

  const externalLink = (href: string) => (chunks: ReactNode) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {chunks}
    </a>
  );

  return (
    <>
      <PageBackBar href={routes.home} label={tCommon("backHome")} />
      <div className="px-4 pb-20 sm:px-6 sm:pb-24">
        <article className="mx-auto mt-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>

          <section className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/70 sm:text-base">
            <h2 className="text-lg font-semibold text-foreground">
              {t("publisher")}
            </h2>
            <p>
              {brand.name}
              <br />
              {t("emailLabel")} :{" "}
              <a href={`mailto:${contactEmail}`} className={linkClass}>
                {contactEmail}
              </a>
            </p>

            <h2 className="text-lg font-semibold text-foreground">
              {t("hosting")}
            </h2>
            <p>{t("hostingText")}</p>

            <h2 className="text-lg font-semibold text-foreground">
              {t("personalData")}
            </h2>
            <p>
              {t.rich("personalDataP1", {
                resend: externalLink("https://resend.com"),
              })}
            </p>
            <p>
              {t.rich("personalDataP2", {
                privacy: externalLink(
                  "https://resend.com/legal/privacy-policy"
                ),
              })}
            </p>
            <p>{t("personalDataP3")}</p>
            <p>
              {t.rich("personalDataP4", {
                turnstile: externalLink(
                  "https://www.cloudflare.com/products/turnstile/"
                ),
              })}
            </p>
            <p>{t("personalDataP5")}</p>
            <p>
              {t.rich("personalDataP6", {
                email: () => (
                  <a href={`mailto:${contactEmail}`} className={linkClass}>
                    {contactEmail}
                  </a>
                ),
              })}
            </p>

            <h2 className="text-lg font-semibold text-foreground">
              {t("cookies")}
            </h2>
            <p>{t("cookiesText")}</p>
          </section>
        </article>
      </div>
    </>
  );
}
