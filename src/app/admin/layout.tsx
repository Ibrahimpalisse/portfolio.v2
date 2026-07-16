import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminLanguageSwitcher } from "@/components/admin/admin-language-switcher";
import { AdminPrefetchSite } from "@/components/admin/admin-prefetch-site";
import { NavigationProgress } from "@/components/navigation-progress";
import { brand } from "@/lib/brand";
import { getAdminLocale, getAdminMessages } from "@/lib/admin/i18n";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAdminLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.meta" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getAdminLocale();
  setRequestLocale(locale);
  const messages = await getAdminMessages(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AdminPrefetchSite />
      <NavigationProgress />
      <div className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-step-accent)_18%,transparent),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent_60%)]"
        />

        <header className="border-b border-border/70 bg-card/40 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              href={routes.home}
              prefetch
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
              {t("layout.backToSite", { name: brand.name })}
            </Link>
            <div className="flex items-center gap-3">
              <AdminLanguageSwitcher />
              <span className="text-xs uppercase tracking-widest text-foreground/45">
                {t("badge")}
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
