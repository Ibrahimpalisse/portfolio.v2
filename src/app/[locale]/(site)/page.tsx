import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HomeSection } from "@/components/sections/home";
import { Services } from "@/components/sections/services";
import { brand } from "@/lib/brand";
import { createPageMetadata, routes } from "@/lib/routes";

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

export default function Home() {
  return (
    <>
      <HomeSection />
      <Services />
      <Projects />
      <About />
      <Testimonials />
      <Contact />
    </>
  );
}
