import type { Metadata } from "next";
import { Allura, Cormorant_Garamond, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PersonJsonLd } from "@/components/json-ld";
import { brand } from "@/lib/brand";
import { getLocaleDirection, type Locale } from "@/i18n/routing";
import {
  getServerResolvedTheme,
  THEME_COOKIE_NAME,
  THEME_DEFAULT,
  THEME_STORAGE_KEY,
} from "@/lib/theme-storage";
import { cn } from "@/lib/utils";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const signatureFont = Allura({
  variable: "--font-name",
  subsets: ["latin"],
  weight: "400",
});

const displaySerif = Cormorant_Garamond({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: {
    default: `${brand.name} — Développeur Web`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  authors: [{ name: brand.owner }],
  creator: brand.owner,
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/images/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/images/favicon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/images/favicon-180.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/images/favicon-32.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const dir = getLocaleDirection(locale);
  const cookieStore = await cookies();
  const resolvedTheme = getServerResolvedTheme(
    cookieStore.get(THEME_COOKIE_NAME)?.value
  );

  return (
    <html
      lang={locale}
      dir={dir}
      translate="no"
      suppressHydrationWarning
      className={cn(
        geistMono.variable,
        signatureFont.variable,
        displaySerif.variable,
        "h-full antialiased",
        resolvedTheme
      )}
      style={{ colorScheme: resolvedTheme }}
    >
      <body className="min-h-dvh overflow-x-clip flex flex-col bg-background text-foreground">
        <PersonJsonLd />
        <ThemeProvider
          initialResolved={resolvedTheme}
          defaultTheme={THEME_DEFAULT}
          enableSystem
          disableTransitionOnChange
          storageKey={THEME_STORAGE_KEY}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
