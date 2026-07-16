/**
 * Catalogue fixe des types métier (site / appli).
 * Labels i18n : `projects.businessTypes.{id}`
 */
export type ProjectBusinessTypeId =
  | "showcase"
  | "ecommerce"
  | "booking"
  | "landing"
  | "dashboard"
  | "webapp"
  | "blog"
  | "marketplace"
  | "other";

export type ProjectBusinessTypeDef = {
  id: ProjectBusinessTypeId;
  /** Label FR de secours (server / tests) — l’UI utilise i18n. */
  label: string;
};

export const PROJECT_BUSINESS_TYPE_DEFS: readonly ProjectBusinessTypeDef[] = [
  { id: "showcase", label: "Site vitrine" },
  { id: "ecommerce", label: "Boutique en ligne" },
  { id: "booking", label: "Réservation" },
  { id: "landing", label: "Landing page" },
  { id: "dashboard", label: "Tableau de bord" },
  { id: "webapp", label: "Application web" },
  { id: "blog", label: "Blog / contenu" },
  { id: "marketplace", label: "Marketplace" },
  { id: "other", label: "Autre" },
] as const;

const BY_ID = new Map(PROJECT_BUSINESS_TYPE_DEFS.map((t) => [t.id, t]));

export const PROJECT_BUSINESS_TYPE_IDS = PROJECT_BUSINESS_TYPE_DEFS.map(
  (t) => t.id
);

export function isProjectBusinessTypeId(
  value: string
): value is ProjectBusinessTypeId {
  return BY_ID.has(value as ProjectBusinessTypeId);
}

export function getProjectBusinessTypeDef(
  id: string
): ProjectBusinessTypeDef | undefined {
  return BY_ID.get(id as ProjectBusinessTypeId);
}

export function resolveProjectBusinessTypeLabels(ids: string[]): string[] {
  return ids
    .map((id) => getProjectBusinessTypeDef(id)?.label)
    .filter((label): label is string => Boolean(label));
}
