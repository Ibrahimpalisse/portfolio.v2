const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** Ajoute apex + www pour le même domaine (redirections Vercel). */
function addSiteOriginVariants(origins: Set<string>, siteUrl: string) {
  const origin = parseOrigin(siteUrl);
  if (!origin) return;

  origins.add(origin);

  try {
    const url = new URL(siteUrl);
    const host = url.hostname;
    if (host.startsWith("www.")) {
      origins.add(`${url.protocol}//${host.slice(4)}`);
    } else if (host.includes(".")) {
      origins.add(`${url.protocol}//www.${host}`);
    }
  } catch {
    /* ignore */
  }
}

/** Origines autorisées pour les POST formulaire (anti-CSRF / anti-abus direct API). */
export function getAllowedFormOrigins(): Set<string> {
  const origins = new Set<string>();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    addSiteOriginVariants(origins, siteUrl);
  }

  const extras = process.env.FORM_ALLOWED_ORIGINS?.split(",") ?? [];
  for (const entry of extras) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    addSiteOriginVariants(origins, trimmed);
  }

  if (process.env.NODE_ENV !== "production") {
    for (const origin of LOCAL_DEV_ORIGINS) origins.add(origin);
  }

  return origins;
}

export function isAllowedFormOrigin(origin: string, allowed: Set<string>): boolean {
  return allowed.has(origin);
}

/**
 * Vérifie Origin ou Referer.
 * En production, rejette les requêtes sans en-tête d'origine fiable.
 */
export function verifyFormRequestOrigin(request: Request): boolean {
  const allowed = getAllowedFormOrigins();
  if (allowed.size === 0) return process.env.NODE_ENV !== "production";

  const origin = request.headers.get("origin");
  if (origin) {
    const parsed = parseOrigin(origin);
    return parsed !== null && isAllowedFormOrigin(parsed, allowed);
  }

  const referer = request.headers.get("referer");
  if (referer) {
    const parsed = parseOrigin(referer);
    return parsed !== null && isAllowedFormOrigin(parsed, allowed);
  }

  return process.env.NODE_ENV !== "production";
}
