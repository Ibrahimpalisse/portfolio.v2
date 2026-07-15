/** Nombre d'éléments affichés sur l'accueil avant le lien « Voir plus ». */
export const HOME_SECTION_PREVIEW = 3;

export function getHomeGridClass(count: number) {
  if (count <= 0) return "grid-cols-1";
  if (count === 1) return "max-w-md grid-cols-1";
  if (count === 2) return "grid-cols-1 md:grid-cols-2";
  if (count === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  if (count === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
}
