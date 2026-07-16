import { absoluteUrl, routes } from "@/lib/routes";
import { brand } from "@/lib/brand";
import { getSiteSettings } from "@/lib/social/store";

export async function PersonJsonLd() {
  const settings = await getSiteSettings();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: brand.name,
    url: absoluteUrl(routes.home),
    email: settings.contactEmail,
    jobTitle: "Développeur web freelance",
    description: brand.description,
    sameAs: [
      settings.discord,
      settings.whatsapp,
      settings.instagram,
      settings.tiktok,
    ].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
