"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Mail, Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { readAdminApiError } from "@/lib/admin/api-error";
import {
  DEFAULT_SITE_SETTINGS,
  SITE_SOCIAL_IDS,
  type SiteSettings,
} from "@/data/site-social";
import {
  siteSocialUpdateSchema,
  type SiteSocialUpdateInput,
} from "@/lib/social/schema";
import { useSubmitGuard } from "@/hooks/use-submit-guard";

type LoadResponse = {
  ok?: boolean;
  configured?: boolean;
  settings?: SiteSettings;
  links?: SiteSettings;
  updatedAt?: string | null;
  error?: string;
  code?: string;
};

type AdminSocialLinksFormProps = {
  initialSettings?: SiteSettings;
  initialConfigured?: boolean;
};

export function AdminSocialLinksForm({
  initialSettings,
  initialConfigured = true,
}: AdminSocialLinksFormProps = {}) {
  const t = useTranslations("admin.socialLinks");
  const tErrors = useTranslations("admin.errors");
  const [configured, setConfigured] = useState(initialConfigured);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(initialSettings === undefined);
  const { loading: saving, setLoading: setSaving, trySubmit } = useSubmitGuard();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SiteSocialUpdateInput>({
    resolver: zodResolver(siteSocialUpdateSchema),
    defaultValues: initialSettings ?? DEFAULT_SITE_SETTINGS,
    mode: "onBlur",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/social-links", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as LoadResponse | null;
      if (!res.ok) {
        setLoadError(
          readAdminApiError(res, body, tErrors("generic"), (key) =>
            tErrors(key)
          )
        );
        return;
      }
      setConfigured(body?.configured !== false);
      const settings = body?.settings ?? body?.links;
      if (settings) {
        reset(settings);
      }
    } catch {
      setLoadError(tErrors("generic"));
    } finally {
      setLoading(false);
    }
  }, [reset, tErrors]);

  useEffect(() => {
    if (initialSettings !== undefined) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");
    setSuccessMessage("");

    const guard = trySubmit();
    if (!guard.allowed) {
      if (guard.reason === "cooldown") {
        setSubmitError(tErrors("cooldown"));
      }
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/social-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(values),
      });
      const body = (await res.json().catch(() => null)) as LoadResponse | null;
      if (!res.ok) {
        setSubmitError(
          readAdminApiError(res, body, tErrors("generic"), (key) =>
            tErrors(key)
          )
        );
        return;
      }
      const settings = body?.settings ?? body?.links;
      if (settings) {
        reset(settings);
      }
      setSuccessMessage(t("saved"));
    } catch {
      setSubmitError(tErrors("generic"));
    } finally {
      setSaving(false);
    }
  });

  if (loading) {
    return (
      <div
        className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8"
        aria-busy="true"
        aria-label={t("loading")}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/70" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`social-skel-${i}`} className="space-y-2">
              <div className="h-3.5 w-28 animate-pulse rounded bg-muted/80" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
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
        <Button type="button" variant="outline" className="mt-4" onClick={() => void load()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Share2 className="h-5 w-5 text-primary" aria-hidden />
          {t("notConfiguredTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65">
          {t("notConfiguredBody")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8"
      noValidate
    >
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Share2 className="h-5 w-5 text-primary" aria-hidden />
          {t("formTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60">{t("formHint")}</p>
      </div>

      <FormField
        id="social-contact-email"
        label={t("fields.contactEmail")}
        hint={t("hints.contactEmail")}
        required
        error={
          errors.contactEmail?.message
            ? t("validation.contactEmail")
            : undefined
        }
        className="sm:col-span-2"
      >
        <div className="relative">
          <Mail
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            aria-hidden
          />
          <Input
            id="social-contact-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("placeholders.contactEmail")}
            className="ps-9"
            aria-invalid={Boolean(errors.contactEmail)}
            {...register("contactEmail")}
          />
        </div>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        {SITE_SOCIAL_IDS.map((id) => (
          <FormField
            key={id}
            id={`social-${id}`}
            label={t(`fields.${id}`)}
            hint={t(`hints.${id}`)}
            error={
              errors[id]?.message
                ? t(`validation.${id}`)
                : undefined
            }
          >
            <Input
              id={`social-${id}`}
              type="url"
              inputMode="url"
              placeholder={t(`placeholders.${id}`)}
              autoComplete="off"
              aria-invalid={Boolean(errors[id])}
              {...register(id)}
            />
          </FormField>
        ))}
      </div>

      {submitError ? <FormError message={submitError} /> : null}
      {successMessage ? (
        <p className="text-sm font-medium text-primary" role="status">
          {successMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={saving || !isDirty}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("saving")}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" aria-hidden />
            {t("save")}
          </>
        )}
      </Button>
    </form>
  );
}
