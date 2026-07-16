"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readAdminApiError } from "@/lib/admin/api-error";
import { PROJECT_BUSINESS_TYPES } from "@/data/project-business-type-icons";
import {
  PROJECT_LIMITS,
  parseProjectWriteBody,
  type ProjectKind,
} from "@/lib/projects/schema";
import { resolveProjectSlug, slugifyProjectTitle } from "@/lib/projects/slug";
import type { ProjectI18n, ProjectRow } from "@/lib/projects/store";
import { cn } from "@/lib/utils";
import { useSubmitGuard } from "@/hooks/use-submit-guard";

type LocaleTab = keyof ProjectI18n;

type EditorState = {
  id?: string;
  slug: string;
  title: ProjectI18n;
  description: ProjectI18n;
  kind: ProjectKind;
  businessTypeIds: string[];
  images: { url: string; label?: Partial<ProjectI18n> }[];
  link: string;
  sortOrder: number;
  published: boolean;
};

const emptyI18n = (): ProjectI18n => ({ fr: "", en: "", ar: "" });

function emptyEditor(): EditorState {
  return {
    slug: "",
    title: emptyI18n(),
    description: emptyI18n(),
    kind: "personal",
    businessTypeIds: [],
    images: [],
    link: "",
    sortOrder: 0,
    published: false,
  };
}

function rowToEditor(row: ProjectRow): EditorState {
  return {
    id: row.id,
    slug: row.slug,
    title: { ...row.title },
    description: { ...row.description },
    kind: row.kind,
    businessTypeIds: [...row.business_type_ids],
    images: row.images.map((img) => ({
      url: img.url,
      label: img.label ? { ...img.label } : undefined,
    })),
    link: row.link ?? "",
    sortOrder: row.sort_order,
    published: row.published,
  };
}

type ListResponse = {
  ok?: boolean;
  configured?: boolean;
  projects?: ProjectRow[];
  error?: string;
  code?: string;
};

type AdminProjectsPanelProps = {
  initialProjects?: ProjectRow[];
  initialConfigured?: boolean;
};

type FieldKey =
  | "title"
  | "description"
  | "slug"
  | "link"
  | "images"
  | "businessTypes"
  | "sortOrder";

type FieldErrors = Partial<Record<FieldKey, string>>;

const ERROR_CODE_TO_FIELD: Record<string, FieldKey> = {
  project_invalid_title: "title",
  project_invalid_description: "description",
  project_invalid_slug: "slug",
  invalid_slug: "slug",
  duplicate_slug: "slug",
  project_invalid_link: "link",
  project_invalid_images: "images",
  project_invalid_image: "images",
  project_invalid_business_types: "businessTypes",
  project_too_many_business_types: "businessTypes",
  invalid_business_type: "businessTypes",
  duplicate_business_type: "businessTypes",
};

function translateErrorCode(
  code: string,
  tErrors: ReturnType<typeof useTranslations>
): string {
  const hasFn = (tErrors as { has?: (k: string) => boolean }).has;
  try {
    if (typeof hasFn === "function" && !hasFn(code)) {
      return tErrors("generic");
    }
    return tErrors(code);
  } catch {
    return tErrors("generic");
  }
}

function fieldErrorsFromCode(
  code: string,
  tErrors: ReturnType<typeof useTranslations>
): { fieldErrors: FieldErrors; submitError: string } {
  const field = ERROR_CODE_TO_FIELD[code];
  const message = translateErrorCode(code, tErrors);
  if (field) return { fieldErrors: { [field]: message }, submitError: "" };
  return { fieldErrors: {}, submitError: message };
}

function translateAdminError(
  res: Response,
  body: { error?: string; code?: string } | null,
  tErrors: ReturnType<typeof useTranslations>
): string {
  const detail = body?.error?.trim();
  const hasFn = (tErrors as { has?: (k: string) => boolean }).has;
  if (
    detail &&
    detail !== "invalid_request" &&
    typeof hasFn === "function" &&
    hasFn(detail)
  ) {
    return tErrors(detail);
  }
  return readAdminApiError(res, body, tErrors("generic"), (key) => {
    try {
      if (typeof hasFn === "function" && !hasFn(key)) {
        return tErrors("generic");
      }
      return tErrors(key);
    } catch {
      return tErrors("generic");
    }
  });
}

export function AdminProjectsPanel({
  initialProjects,
  initialConfigured = true,
}: AdminProjectsPanelProps = {}) {
  const t = useTranslations("admin.projects");
  const tErrors = useTranslations("admin.errors");
  const [configured, setConfigured] = useState(initialConfigured);
  const [projects, setProjects] = useState<ProjectRow[]>(
    initialProjects ?? []
  );
  const [loading, setLoading] = useState(initialProjects === undefined);
  const [loadError, setLoadError] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [localeTab, setLocaleTab] = useState<LocaleTab>("fr");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const { loading: saving, setLoading: setSaving, trySubmit } =
    useSubmitGuard();

  function clearFieldError(key: FieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function applyApiError(body: { error?: string; code?: string } | null, res: Response) {
    const detail = body?.error?.trim();
    if (detail && detail in ERROR_CODE_TO_FIELD) {
      const mapped = fieldErrorsFromCode(detail, tErrors);
      setFieldErrors(mapped.fieldErrors);
      setSubmitError(mapped.submitError);
      if (mapped.fieldErrors.title || mapped.fieldErrors.description) {
        setLocaleTab("fr");
      }
      return;
    }
    setFieldErrors({});
    setSubmitError(translateAdminError(res, body, tErrors));
  }

  const load = useCallback(
    async (opts?: { signal?: AbortSignal; soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      setLoadError("");
      try {
        const res = await fetch("/api/admin/projects", {
          credentials: "same-origin",
          cache: "no-store",
          signal: opts?.signal,
        });
        if (opts?.signal?.aborted) return;
        const body = (await res.json().catch(() => null)) as ListResponse | null;
        if (!res.ok) {
          setLoadError(translateAdminError(res, body, tErrors));
          return;
        }
        setConfigured(body?.configured !== false);
        setProjects(body?.projects ?? []);
      } catch (err) {
        if (opts?.signal?.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(tErrors("generic"));
      } finally {
        if (!opts?.signal?.aborted) setLoading(false);
      }
    },
    [tErrors]
  );

  useEffect(() => {
    if (initialProjects !== undefined) return;
    const ac = new AbortController();
    void load({ signal: ac.signal });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  const editorPayload = useMemo(() => {
    if (!editor) return null;
    const fillFromFr = (i18n: ProjectI18n): ProjectI18n => ({
      fr: i18n.fr.trim(),
      en: i18n.en.trim() || i18n.fr.trim(),
      ar: i18n.ar.trim() || i18n.fr.trim(),
    });
    const title = fillFromFr(editor.title);
    return {
      slug: resolveProjectSlug(editor.slug, title.fr),
      title,
      description: fillFromFr(editor.description),
      kind: editor.kind,
      businessTypeIds: editor.businessTypeIds,
      images: editor.images.map((img) => ({
        url: img.url,
        ...(img.label ? { label: img.label } : {}),
      })),
      link: editor.link.trim() || null,
      sortOrder: editor.sortOrder,
      published: editor.published,
    };
  }, [editor]);

  function openNew() {
    setEditor(emptyEditor());
    setLocaleTab("fr");
    setFieldErrors({});
    setSubmitError("");
    setSuccessMessage("");
  }

  function openEdit(row: ProjectRow) {
    setEditor(rowToEditor(row));
    setLocaleTab("fr");
    setFieldErrors({});
    setSubmitError("");
    setSuccessMessage("");
  }

  function closeModal() {
    setEditor(null);
    setFieldErrors({});
    setSubmitError("");
    setSuccessMessage("");
  }

  async function save() {
    if (!editor || !editorPayload) return;
    setFieldErrors({});
    setSubmitError("");
    setSuccessMessage("");

    const local = parseProjectWriteBody(editorPayload);
    if (!local.ok) {
      const mapped = fieldErrorsFromCode(local.error, tErrors);
      setFieldErrors(mapped.fieldErrors);
      setSubmitError(mapped.submitError);
      if (mapped.fieldErrors.title || mapped.fieldErrors.description) {
        setLocaleTab("fr");
      }
      return;
    }

    const guard = trySubmit();
    if (!guard.allowed) {
      if (guard.reason === "cooldown") setSubmitError(tErrors("cooldown"));
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(editor.id);
      const res = await fetch(
        isEdit ? `/api/admin/projects/${editor.id}` : "/api/admin/projects",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(editorPayload),
        }
      );
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        code?: string;
        project?: ProjectRow;
      } | null;
      if (!res.ok) {
        applyApiError(body, res);
        return;
      }
      setSuccessMessage(t("saved"));
      closeModal();
      await load();
    } catch {
      setSubmitError(tErrors("generic"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSubmitError("");
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        code?: string;
        error?: string;
      } | null;
      setSubmitError(translateAdminError(res, body, tErrors));
      return;
    }
    closeModal();
    await load();
  }

  async function onUpload(fileList: FileList | null) {
    if (!fileList?.length || !editor) return;
    const file = fileList[0];
    if (!file) return;
    setUploading(true);
    clearFieldError("images");
    setSubmitError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/projects/upload", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const body = (await res.json().catch(() => null)) as {
        url?: string;
        code?: string;
        error?: string;
      } | null;
      if (!res.ok || !body?.url) {
        const detail = body?.error?.trim();
        if (detail && detail in ERROR_CODE_TO_FIELD) {
          applyApiError(body, res);
        } else {
          setFieldErrors({
            images: translateAdminError(res, body, tErrors),
          });
        }
        return;
      }
      setEditor({
        ...editor,
        images: [...editor.images, { url: body.url }],
      });
    } catch {
      setFieldErrors({ images: tErrors("generic") });
    } finally {
      setUploading(false);
    }
  }

  function moveImage(index: number, dir: -1 | 1) {
    if (!editor) return;
    const next = index + dir;
    if (next < 0 || next >= editor.images.length) return;
    const images = [...editor.images];
    const tmp = images[index]!;
    images[index] = images[next]!;
    images[next] = tmp;
    setEditor({ ...editor, images });
  }

  function toggleBusinessType(id: string) {
    if (!editor) return;
    clearFieldError("businessTypes");
    const has = editor.businessTypeIds.includes(id);
    if (has) {
      setEditor({
        ...editor,
        businessTypeIds: editor.businessTypeIds.filter((typeId) => typeId !== id),
      });
      return;
    }
    if (editor.businessTypeIds.length >= PROJECT_LIMITS.maxBusinessTypes) {
      setFieldErrors((prev) => ({
        ...prev,
        businessTypes: t("businessTypesMax", {
          max: PROJECT_LIMITS.maxBusinessTypes,
        }),
      }));
      return;
    }
    setEditor({
      ...editor,
      businessTypeIds: [...editor.businessTypeIds, id],
    });
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t("loading")}>
        <div className="h-10 w-36 animate-pulse rounded-full bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={`skel-${i}`}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="aspect-[16/10] animate-pulse bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <FormError message={loadError} />
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => void load()}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FolderKanban className="h-5 w-5 text-primary" aria-hidden />
          {t("notConfiguredTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-foreground/65">
          {t("notConfiguredBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground/80">
          {t("listTitle")}
          {projects.length > 0 ? (
            <span className="ms-2 text-foreground/45">({projects.length})</span>
          ) : null}
        </h2>
        <Button type="button" size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden />
          {t("new")}
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-10 text-center text-sm text-foreground/55">
          {t("empty")}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const cover = p.images[0]?.url;
            const name = p.title.fr || p.slug;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="group w-full overflow-hidden rounded-2xl border border-border bg-card text-start transition-colors hover:border-primary/35"
                >
                  <div className="relative aspect-[16/10] bg-muted">
                    {cover ? (
                      <Image
                        src={cover}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-foreground/40">
                        {t("noCover")}
                      </div>
                    )}
                    <span
                      className={cn(
                        "absolute start-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        p.published
                          ? "bg-primary/90 text-primary-foreground"
                          : "bg-background/85 text-foreground/60"
                      )}
                    >
                      {p.published ? t("published") : t("draft")}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="truncate font-medium leading-snug">{name}</p>
                    <p className="mt-1 text-xs text-foreground/50">
                      {p.kind === "sold" ? t("kindSold") : t("kindPersonal")}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(next) => {
          if (!next) closeModal();
        }}
      >
        {editor ? (
          <DialogContent
            className="flex max-h-[min(92dvh,52rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:p-0"
            closeLabel={t("cancel")}
          >
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
              <DialogTitle>
                {editor.id ? t("editTitle") : t("createTitle")}
              </DialogTitle>
              <DialogDescription>{t("localeHint")}</DialogDescription>
            </DialogHeader>

            <div className="scrollbar-overlay min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  {(["fr", "en", "ar"] as const).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocaleTab(loc)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs uppercase tracking-wide",
                        localeTab === loc
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-foreground/60"
                      )}
                    >
                      {loc}
                    </button>
                  ))}
                </div>

                <FormField
                  id="proj-title"
                  label={t("fields.title")}
                  required
                  error={fieldErrors.title}
                >
                  <Input
                    id="proj-title"
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={
                      fieldErrors.title ? "proj-title-error" : undefined
                    }
                    value={editor.title[localeTab]}
                    onChange={(e) => {
                      clearFieldError("title");
                      const value = e.target.value;
                      const nextTitle = {
                        ...editor.title,
                        [localeTab]: value,
                      };
                      const prevAuto = slugifyProjectTitle(editor.title.fr);
                      const shouldAutoSlug =
                        !editor.id &&
                        localeTab === "fr" &&
                        (!editor.slug.trim() || editor.slug === prevAuto);
                      const nextSlug = slugifyProjectTitle(value);
                      setEditor({
                        ...editor,
                        title: nextTitle,
                        ...(shouldAutoSlug && nextSlug
                          ? { slug: nextSlug }
                          : {}),
                      });
                    }}
                  />
                </FormField>

                <FormField
                  id="proj-desc"
                  label={t("fields.description")}
                  required
                  error={fieldErrors.description}
                >
                  <textarea
                    id="proj-desc"
                    rows={4}
                    aria-invalid={Boolean(fieldErrors.description)}
                    aria-describedby={
                      fieldErrors.description ? "proj-desc-error" : undefined
                    }
                    value={editor.description[localeTab]}
                    onChange={(e) => {
                      clearFieldError("description");
                      setEditor({
                        ...editor,
                        description: {
                          ...editor.description,
                          [localeTab]: e.target.value,
                        },
                      });
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-step-accent/50"
                  />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="proj-slug"
                    label={t("fields.slug")}
                    required
                    error={fieldErrors.slug}
                  >
                    <Input
                      id="proj-slug"
                      aria-invalid={Boolean(fieldErrors.slug)}
                      aria-describedby={
                        fieldErrors.slug ? "proj-slug-error" : undefined
                      }
                      value={editor.slug}
                      placeholder={t("slugPlaceholder")}
                      onChange={(e) => {
                        clearFieldError("slug");
                        setEditor({ ...editor, slug: e.target.value });
                      }}
                    />
                    <p className="text-xs text-foreground/45">{t("slugHint")}</p>
                  </FormField>
                  <FormField id="proj-kind" label={t("fields.kind")} required>
                    <Select
                      value={editor.kind}
                      onValueChange={(value) =>
                        setEditor({
                          ...editor,
                          kind: value as ProjectKind,
                        })
                      }
                    >
                      <SelectTrigger id="proj-kind" aria-label={t("fields.kind")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">
                          {t("kindPersonal")}
                        </SelectItem>
                        <SelectItem value="sold">{t("kindSold")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField
                    id="proj-sort"
                    label={t("fields.sortOrder")}
                    error={fieldErrors.sortOrder}
                  >
                    <Input
                      id="proj-sort"
                      type="number"
                      aria-invalid={Boolean(fieldErrors.sortOrder)}
                      value={editor.sortOrder}
                      onChange={(e) => {
                        clearFieldError("sortOrder");
                        setEditor({
                          ...editor,
                          sortOrder: Number(e.target.value) || 0,
                        });
                      }}
                    />
                  </FormField>
                  <FormField
                    id="proj-link"
                    label={t("fields.link")}
                    error={fieldErrors.link}
                  >
                    <Input
                      id="proj-link"
                      type="url"
                      placeholder="https://"
                      aria-invalid={Boolean(fieldErrors.link)}
                      aria-describedby={
                        fieldErrors.link ? "proj-link-error" : undefined
                      }
                      value={editor.link}
                      onChange={(e) => {
                        clearFieldError("link");
                        setEditor({ ...editor, link: e.target.value });
                      }}
                    />
                  </FormField>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editor.published}
                    onChange={(e) =>
                      setEditor({ ...editor, published: e.target.checked })
                    }
                  />
                  {t("fields.published")}
                </label>

                <div>
                  <p className="mb-1 text-sm font-medium">
                    {t("fields.businessTypes")}
                  </p>
                  <p className="mb-2 text-xs text-foreground/45">
                    {t("businessTypesHint", {
                      max: PROJECT_LIMITS.maxBusinessTypes,
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_BUSINESS_TYPES.map((type) => {
                      const active = editor.businessTypeIds.includes(type.id);
                      const Icon = type.Icon;
                      const atMax =
                        !active &&
                        editor.businessTypeIds.length >=
                          PROJECT_LIMITS.maxBusinessTypes;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          disabled={atMax}
                          onClick={() => toggleBusinessType(type.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                            active
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : "border-border text-foreground/55 hover:border-foreground/25",
                            atMax && "cursor-not-allowed opacity-40"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                          {t(`businessTypes.${type.id}`)}
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.businessTypes ? (
                    <div className="mt-2">
                      <FormError
                        id="proj-business-types-error"
                        message={fieldErrors.businessTypes}
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{t("fields.images")}</p>
                    <label className="relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-border px-3 py-1.5 text-xs hover:border-foreground/25">
                      {uploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {t("upload")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        disabled={uploading}
                        onChange={(e) => {
                          clearFieldError("images");
                          void onUpload(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {editor.images.length === 0 ? (
                    <p className="text-xs text-foreground/50">
                      {t("imagesEmpty")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {editor.images.map((img, index) => (
                        <li
                          key={`${img.url}-${index}`}
                          className="flex items-center gap-3 rounded-xl border border-border p-2"
                        >
                          <div className="relative h-14 w-20 overflow-hidden rounded-lg bg-muted">
                            <Image
                              src={img.url}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <p className="min-w-0 flex-1 truncate text-xs text-foreground/55">
                            {img.url}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="rounded-md p-1 hover:bg-muted"
                              aria-label={t("moveUp")}
                              onClick={() => moveImage(index, -1)}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-md p-1 hover:bg-muted"
                              aria-label={t("moveDown")}
                              onClick={() => moveImage(index, 1)}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-md p-1 text-destructive hover:bg-muted"
                              aria-label={t("removeImage")}
                              onClick={() => {
                                clearFieldError("images");
                                setEditor({
                                  ...editor,
                                  images: editor.images.filter(
                                    (_, i) => i !== index
                                  ),
                                });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {fieldErrors.images ? (
                    <div className="mt-2">
                      <FormError
                        id="proj-images-error"
                        message={fieldErrors.images}
                      />
                    </div>
                  ) : null}
                </div>

                {submitError ? <FormError message={submitError} /> : null}
                {successMessage ? (
                  <p className="text-sm font-medium text-primary" role="status">
                    {successMessage}
                  </p>
                ) : null}
              </div>

              <DialogFooter className="shrink-0 flex-row flex-wrap justify-start gap-3 border-t border-border px-5 py-4 sm:justify-start sm:px-6">
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t("save")}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={closeModal}>
                  {t("cancel")}
                </Button>
                {editor.id ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("delete")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("confirmDelete")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("confirmDeleteCancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void remove(editor.id!)}
                        >
                          {t("confirmDeleteAction")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
