import { brand } from "@/lib/brand";
import { absoluteUrl, routes } from "@/lib/routes";

export function PersonJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: brand.name,
    url: absoluteUrl(routes.home),
    email: brand.email,
    jobTitle: "Développeur web freelance",
    description: brand.description,
    sameAs: Object.values(brand.social).filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
