import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { brand } from "@/lib/brand";
import { createPageMetadata, routes } from "@/lib/routes";
import { getPublishedReviews } from "@/lib/reviews/store";

const ReviewsPage = dynamic(
  () => import("@/components/sections/reviews-page").then((m) => m.ReviewsPage)
);

export const metadata: Metadata = createPageMetadata({
  title: `Avis clients — ${brand.name}`,
  description: `Découvrez les témoignages et avis clients de ${brand.name} : sites web, e-commerce et applications sur-mesure.`,
  path: routes.reviews,
});

export default async function AvisRoute() {
  const reviews = await getPublishedReviews();
  return <ReviewsPage reviews={reviews} />;
}
