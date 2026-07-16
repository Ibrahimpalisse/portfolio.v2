import type { Locale } from "@/i18n/routing";
import { resolveProjectBusinessTypeLabels } from "@/data/project-business-types";
import {
  projectCatalog,
  type LocalizedProjectItem,
  type ProjectCategoryKey,
} from "@/data/projects";
import type {
  ProjectKind,
  ProjectLocale,
  ProjectPatchInput,
  ProjectWriteInput,
} from "@/lib/projects/schema";
import {
  createSupabaseServiceClient,
  isSupabaseServiceConfigured,
} from "@/lib/supabase/service";

export type ProjectI18n = {
  fr: string;
  en: string;
  ar: string;
};

export type ProjectImageStored = {
  url: string;
  label?: Partial<ProjectI18n>;
};

export type ProjectRow = {
  id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  title: ProjectI18n;
  description: ProjectI18n;
  kind: ProjectKind;
  business_type_ids: string[];
  images: ProjectImageStored[];
  link: string | null;
  sort_order: number;
  published: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asI18n(value: unknown, fallback = ""): ProjectI18n {
  const obj = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  return {
    fr: typeof obj.fr === "string" ? obj.fr : fallback,
    en: typeof obj.en === "string" ? obj.en : fallback,
    ar: typeof obj.ar === "string" ? obj.ar : fallback,
  };
}

function asImages(value: unknown): ProjectImageStored[] {
  if (!Array.isArray(value)) return [];
  const images: ProjectImageStored[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.url !== "string" || !row.url) continue;
    images.push({
      url: row.url,
      label:
        row.label && typeof row.label === "object"
          ? asI18n(row.label, "")
          : undefined,
    });
  }
  return images;
}

function normalizeRow(raw: Record<string, unknown>): ProjectRow {
  return {
    id: String(raw.id),
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    slug: String(raw.slug),
    title: asI18n(raw.title),
    description: asI18n(raw.description),
    kind: raw.kind === "sold" ? "sold" : "personal",
    business_type_ids: Array.isArray(raw.business_type_ids)
      ? raw.business_type_ids.filter((t): t is string => typeof t === "string")
      : [],
    images: asImages(raw.images),
    link: typeof raw.link === "string" ? raw.link : null,
    sort_order: Number(raw.sort_order) || 0,
    published: Boolean(raw.published),
  };
}

function pickLocale(
  i18n: ProjectI18n,
  locale: ProjectLocale | Locale
): string {
  const key = locale as ProjectLocale;
  return i18n[key] || i18n.fr || i18n.en || i18n.ar || "";
}

export function projectRowToLocalized(
  row: ProjectRow,
  locale: Locale,
  categoryLabel: string
): LocalizedProjectItem {
  return {
    id: row.id,
    categoryKey: row.kind as ProjectCategoryKey,
    title: pickLocale(row.title, locale),
    category: categoryLabel,
    desc: pickLocale(row.description, locale),
    tags: resolveProjectBusinessTypeLabels(row.business_type_ids),
    businessTypeIds: row.business_type_ids,
    images: row.images.map((img) => ({
      src: img.url,
      label: img.label
        ? pickLocale(
            {
              fr: img.label.fr ?? "",
              en: img.label.en ?? "",
              ar: img.label.ar ?? "",
            },
            locale
          ) || undefined
        : undefined,
    })),
    link: row.link ?? undefined,
  };
}

/** Sélection publique. Si BDD vide / absente → null (caller fallback démo). */
export async function listPublishedProjectRows(): Promise<ProjectRow[] | null> {
  if (!isSupabaseServiceConfigured()) return null;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, created_at, updated_at, slug, title, description, kind, business_type_ids, images, link, sort_order, published"
    )
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projects] list published", error.message);
    return null;
  }

  return (data ?? []).map((row) =>
    normalizeRow(row as Record<string, unknown>)
  );
}

export async function getPublishedProjects(
  locale: Locale,
  categoryLabels: Record<ProjectCategoryKey, string>
): Promise<LocalizedProjectItem[]> {
  const rows = await listPublishedProjectRows();
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows
    .filter((row) => row.images.length > 0)
    .map((row) =>
      projectRowToLocalized(
        row,
        locale,
        categoryLabels[row.kind] ?? row.kind
      )
    );
}

export async function listProjectsForAdmin(limit = 100): Promise<
  | { ok: true; configured: true; projects: ProjectRow[] }
  | { ok: true; configured: false; projects: [] }
  | { ok: false; reason: "persist_failed" }
> {
  if (!isSupabaseServiceConfigured()) {
    return { ok: true, configured: false, projects: [] };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { ok: true, configured: false, projects: [] };
  }

  const safeLimit = Math.min(Math.max(1, limit), 200);
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, created_at, updated_at, slug, title, description, kind, business_type_ids, images, link, sort_order, published"
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("[projects] list admin", error.message);
    return { ok: false, reason: "persist_failed" };
  }

  return {
    ok: true,
    configured: true,
    projects: (data ?? []).map((row) =>
      normalizeRow(row as Record<string, unknown>)
    ),
  };
}

function writeToDbPayload(values: ProjectWriteInput | ProjectPatchInput) {
  const payload: Record<string, unknown> = {};
  if (values.slug !== undefined) payload.slug = values.slug;
  if (values.title !== undefined) payload.title = values.title;
  if (values.description !== undefined) payload.description = values.description;
  if (values.kind !== undefined) payload.kind = values.kind;
  if (values.businessTypeIds !== undefined) {
    payload.business_type_ids = values.businessTypeIds;
  }
  if (values.images !== undefined) {
    payload.images = values.images.map((img) => ({
      url: img.url,
      ...(img.label ? { label: img.label } : {}),
    }));
  }
  if (values.link !== undefined) payload.link = values.link;
  if (values.sortOrder !== undefined) payload.sort_order = values.sortOrder;
  if (values.published !== undefined) payload.published = values.published;
  return payload;
}

export async function createProject(
  values: ProjectWriteInput
): Promise<
  | { ok: true; project: ProjectRow }
  | { ok: false; reason: "not_configured" | "persist_failed" | "duplicate_slug" }
> {
  if (!isSupabaseServiceConfigured()) {
    return { ok: false, reason: "not_configured" };
  }
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const { data, error } = await supabase
    .from("projects")
    .insert(writeToDbPayload(values))
    .select(
      "id, created_at, updated_at, slug, title, description, kind, business_type_ids, images, link, sort_order, published"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, reason: "duplicate_slug" };
    }
    console.error("[projects] create", error.message);
    return { ok: false, reason: "persist_failed" };
  }

  return {
    ok: true,
    project: normalizeRow(data as Record<string, unknown>),
  };
}

export async function updateProject(
  id: string,
  values: ProjectPatchInput
): Promise<
  | { ok: true; project: ProjectRow }
  | {
      ok: false;
      reason: "not_configured" | "persist_failed" | "duplicate_slug" | "invalid_id";
    }
> {
  if (!UUID_RE.test(id)) return { ok: false, reason: "invalid_id" };
  if (!isSupabaseServiceConfigured()) {
    return { ok: false, reason: "not_configured" };
  }
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const { data, error } = await supabase
    .from("projects")
    .update(writeToDbPayload(values))
    .eq("id", id)
    .select(
      "id, created_at, updated_at, slug, title, description, kind, business_type_ids, images, link, sort_order, published"
    )
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, reason: "duplicate_slug" };
    }
    console.error("[projects] update", error.message);
    return { ok: false, reason: "persist_failed" };
  }

  if (!data) return { ok: false, reason: "persist_failed" };

  return {
    ok: true,
    project: normalizeRow(data as Record<string, unknown>),
  };
}

export async function deleteProject(
  id: string
): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  if (!isSupabaseServiceConfigured()) return false;
  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    console.error("[projects] delete", error.message);
    return false;
  }
  return true;
}

export function countDemoProjects(): number {
  return projectCatalog.length;
}
