export type ReviewItem = {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  initials?: string;
};

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * DONNÉES DÉMO — Remplacez par de vrais avis clients validés avant la mise en prod.
 * Publication manuelle : ajoutez un objet ici après validation (email / admin).
 */
export const reviews: ReviewItem[] = [
  {
    id: "demo-marie",
    name: "Marie D.",
    role: "Gérante, boutique Mode & Co",
    text: "Site livré en temps et en heure, design soigné et facile à utiliser. Mes clientes adorent la nouvelle boutique en ligne.",
    rating: 5,
  },
  {
    id: "demo-karim",
    name: "Karim B.",
    role: "Fondateur, Nova Analytics",
    text: "Réactif, à l'écoute et très compétent. Le tableau de bord est clair et correspond exactement à ce qu'on avait en tête.",
    rating: 5,
  },
  {
    id: "demo-sophie",
    name: "Sophie L.",
    role: "Restauratrice, Saveurs du Sud",
    text: "Mon site est enfin moderne. Réservations en ligne, menu visible sur mobile — tout fonctionne parfaitement.",
    rating: 5,
  },
  {
    id: "demo-julie",
    name: "Julie M.",
    role: "Photographe indépendante",
    text: "Une galerie élégante qui met en valeur mon travail. Les échanges étaient simples du début à la fin du projet.",
    rating: 4,
  },
];

export function getReviewInitials(review: ReviewItem) {
  return review.initials ?? initialsFromName(review.name);
}
