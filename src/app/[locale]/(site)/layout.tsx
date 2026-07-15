import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { NavigationProgress } from "@/components/navigation-progress";
import { ScrollRestoration } from "@/components/scroll-restoration";
import { SkipToContent } from "@/components/skip-to-content";
import { LeaveReviewModal } from "@/components/sections/leave-review-modal";
import { ContactModal } from "@/components/sections/contact-modal";
import { type Locale, routing } from "@/i18n/routing";

type SiteLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
  const { locale } = await params;

  if (hasLocale(routing.locales, locale)) {
    setRequestLocale(locale as Locale);
  }

  return (
    <>
      <SkipToContent />
      <ScrollRestoration />
      <NavigationProgress />
      <Navbar key={locale} />
      <main id="main-content" className="min-h-dvh flex-1 overflow-x-clip bg-background">
        {children}
      </main>
      <Footer />
      <LeaveReviewModal showCallout={false} />
      <ContactModal showCallout={false} />
    </>
  );
}
