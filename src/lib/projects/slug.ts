import { PROJECT_LIMITS } from "@/lib/projects/schema";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Convertit un titre en slug URL (a-z, 0-9, tirets). Chaîne vide si inexploitable. */
export function slugifyProjectTitle(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PROJECT_LIMITS.slugMax);

  if (base.length >= PROJECT_LIMITS.slugMin && SLUG_RE.test(base)) {
    return base;
  }
  return "";
}

export function isValidProjectSlug(value: string): boolean {
  return (
    value.length >= PROJECT_LIMITS.slugMin &&
    value.length <= PROJECT_LIMITS.slugMax &&
    SLUG_RE.test(value)
  );
}

/** Utilise le slug saisi s’il est valide, sinon dérive du titre (fallback horodaté). */
export function resolveProjectSlug(slug: string, titleFr: string): string {
  const trimmed = slug.trim().toLowerCase();
  if (isValidProjectSlug(trimmed)) return trimmed;
  const fromTitle = slugifyProjectTitle(titleFr);
  if (isValidProjectSlug(fromTitle)) return fromTitle;
  return `projet-${Date.now().toString(36)}`;
}
