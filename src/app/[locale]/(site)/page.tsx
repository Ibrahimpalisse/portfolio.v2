import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getLocale } from "next-intl/server";
import { HomeSection } from "@/components/sections/home";
import { Services } from "@/components/sections/services";
import { brand } from "@/lib/brand";
import { createPageMetadata, routes } from "@/lib/routes";
import { getPublishedReviews } from "@/lib/reviews/store";
import { getSiteProjects } from "@/lib/projects/site";
import { getPublicContactEmail } from "@/lib/social/store";
import type { Locale } from "@/i18n/routing";

const Projects = dynamic(
  () => import("@/components/sections/projects").then((m) => m.Projects)
);
const About = dynamic(
  () => import("@/components/sections/about").then((m) => m.About)
);
const Testimonials = dynamic(
  () => import("@/components/sections/testimonials").then((m) => m.Testimonials)
);
const Contact = dynamic(
  () => import("@/components/sections/contact").then((m) => m.Contact)
);

export const metadata: Metadata = createPageMetadata({
  title: `${brand.name} — Développeur Web`,
  description: brand.description,
  path: routes.home,
});

export default async function Home() {
  const locale = (await getLocale()) as Locale;
  const [reviews, projects, contactEmail] = await Promise.all([
    getPublishedReviews(),
    getSiteProjects(locale),
    getPublicContactEmail(),
  ]);

  return (
    <>
      <HomeSection />
      <Services />
      <Projects projects={projects} />
      <About />
      <Testimonials reviews={reviews} />
      <Contact contactEmail={contactEmail} />
    </>
  );
}
