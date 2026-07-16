import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata, routes } from "@/lib/routes";

/** Formulaire avis : pas d’indexation (ouvre la modale via query). */
export const metadata: Metadata = createPageMetadata({
  title: "Laisser un avis",
  description: "Formulaire d’avis client.",
  path: routes.leaveReview,
  index: false,
});

export default function LaisserUnAvisPage() {
  redirect("/?openReview=1");
}
