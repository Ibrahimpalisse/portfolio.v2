import { z } from "zod";
import { isProjectBusinessTypeId } from "@/data/project-business-types";
import { isSafeHttpUrl } from "@/lib/review-schema";

export const PROJECT_IMAGE_BUCKET = "portfolio-projects";

export const PROJECT_LIMITS = {
  maxBodyBytes: 48_000,
  slugMin: 2,
  slugMax: 80,
  titleMin: 2,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 2000,
  linkMax: 500,
  maxImages: 12,
  maxBusinessTypes: 4,
  imageLabelMax: 80,
  sortOrderMin: -9999,
  sortOrderMax: 9999,
  uploadMaxBytes: 3 * 1024 * 1024,
  allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif"] as const,
} as const;

export const PROJECT_KINDS = ["personal", "sold"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const LOCALES = ["fr", "en", "ar"] as const;
export type ProjectLocale = (typeof LOCALES)[number];

const localeString = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max);

export const projectI18nSchema = z.object({
  fr: localeString(PROJECT_LIMITS.titleMin, PROJECT_LIMITS.titleMax),
  en: localeString(PROJECT_LIMITS.titleMin, PROJECT_LIMITS.titleMax),
  ar: localeString(PROJECT_LIMITS.titleMin, PROJECT_LIMITS.titleMax),
});

export const projectDescriptionI18nSchema = z.object({
  fr: localeString(PROJECT_LIMITS.descriptionMin, PROJECT_LIMITS.descriptionMax),
  en: localeString(PROJECT_LIMITS.descriptionMin, PROJECT_LIMITS.descriptionMax),
  ar: localeString(PROJECT_LIMITS.descriptionMin, PROJECT_LIMITS.descriptionMax),
});

const optionalLabelI18n = z
  .object({
    fr: z.string().trim().max(PROJECT_LIMITS.imageLabelMax).optional(),
    en: z.string().trim().max(PROJECT_LIMITS.imageLabelMax).optional(),
    ar: z.string().trim().max(PROJECT_LIMITS.imageLabelMax).optional(),
  })
  .optional();

function isAllowedImageUrl(url: string): boolean {
  if (!isSafeHttpUrl(url)) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname;
    return (
      host.endsWith(".supabase.co") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export const projectImageSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .refine(isAllowedImageUrl, "invalid_image_url"),
  label: optionalLabelI18n,
});

export const projectWriteSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(PROJECT_LIMITS.slugMin)
    .max(PROJECT_LIMITS.slugMax)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid_slug"),
  title: projectI18nSchema,
  description: projectDescriptionI18nSchema,
  kind: z.enum(PROJECT_KINDS),
  businessTypeIds: z
    .array(z.string())
    .max(PROJECT_LIMITS.maxBusinessTypes)
    .refine((ids) => ids.every(isProjectBusinessTypeId), "invalid_business_type")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "duplicate_business_type"
    ),
  images: z
    .array(projectImageSchema)
    .min(1)
    .max(PROJECT_LIMITS.maxImages),
  link: z
    .string()
    .trim()
    .max(PROJECT_LIMITS.linkMax)
    .nullable()
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      return v;
    })
    .refine((v) => v === null || isSafeHttpUrl(v), "invalid_link"),
  sortOrder: z
    .number()
    .int()
    .min(PROJECT_LIMITS.sortOrderMin)
    .max(PROJECT_LIMITS.sortOrderMax),
  published: z.boolean(),
});

export type ProjectWriteInput = z.infer<typeof projectWriteSchema>;

/** Patch : pas de defaults (évite un `{}` qui peuplerait sortOrder/published). */
export const projectPatchSchema = z
  .object({
    slug: projectWriteSchema.shape.slug.optional(),
    title: projectWriteSchema.shape.title.optional(),
    description: projectWriteSchema.shape.description.optional(),
    kind: projectWriteSchema.shape.kind.optional(),
    businessTypeIds: projectWriteSchema.shape.businessTypeIds.optional(),
    images: projectWriteSchema.shape.images.optional(),
    link: projectWriteSchema.shape.link.optional(),
    sortOrder: projectWriteSchema.shape.sortOrder.optional(),
    published: projectWriteSchema.shape.published.optional(),
  })
  .strict();

export type ProjectPatchInput = z.infer<typeof projectPatchSchema>;

function mapProjectZodError(
  issues: z.core.$ZodIssue[]
): string {
  const issue = issues[0];
  if (!issue) return "invalid_request";
  const path = issue.path.map(String).join(".");
  const msg = issue.message;

  if (msg === "invalid_slug" || path === "slug") return "project_invalid_slug";
  if (msg === "invalid_business_type" || msg === "duplicate_business_type") {
    return msg;
  }
  if (
    path === "businessTypeIds" &&
    (issue.code === "too_big" || /too big|at most|max/i.test(msg))
  ) {
    return "project_too_many_business_types";
  }
  if (msg === "invalid_image_url") return "project_invalid_image";
  if (msg === "invalid_link") return "project_invalid_link";
  if (path.startsWith("title")) return "project_invalid_title";
  if (path.startsWith("description")) return "project_invalid_description";
  if (path.startsWith("images")) return "project_invalid_images";
  if (path === "businessTypeIds") return "project_invalid_business_types";
  return msg || "invalid_request";
}

export function parseProjectWriteBody(
  body: unknown
):
  | { ok: true; values: ProjectWriteInput }
  | { ok: false; error: string } {
  const parsed = projectWriteSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: mapProjectZodError(parsed.error.issues),
    };
  }
  return { ok: true, values: parsed.data };
}

export function parseProjectPatchBody(
  body: unknown
):
  | { ok: true; values: ProjectPatchInput }
  | { ok: false; error: string } {
  const parsed = projectPatchSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: mapProjectZodError(parsed.error.issues),
    };
  }
  if (Object.keys(parsed.data).length === 0) {
    return { ok: false, error: "empty_patch" };
  }
  return { ok: true, values: parsed.data };
}

export function isValidProjectKind(value: unknown): value is ProjectKind {
  return (
    typeof value === "string" &&
    (PROJECT_KINDS as readonly string[]).includes(value)
  );
}
