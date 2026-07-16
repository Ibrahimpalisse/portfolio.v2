"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { BarChart3, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { readAdminApiError } from "@/lib/admin/api-error";
import {
  aboutStatsUpdateSchema,
  type AboutStatsUpdateInput,
} from "@/lib/about/schema";
import { DEFAULT_ABOUT_STATS } from "@/data/about-stats";
import { useSubmitGuard } from "@/hooks/use-submit-guard";

type LoadResponse = {
  ok?: boolean;
  configured?: boolean;
  stats?: AboutStatsUpdateInput;
  updatedAt?: string | null;
  error?: string;
  code?: string;
};

type AdminAboutStatsFormProps = {
  initialStats?: AboutStatsUpdateInput;
  initialConfigured?: boolean;
};

export function AdminAboutStatsForm({
  initialStats,
  initialConfigured = true,
}: AdminAboutStatsFormProps = {}) {
  const t = useTranslations("admin.aboutStats");
  const tErrors = useTranslations("admin.errors");
  const [configured, setConfigured] = useState(initialConfigured);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(initialStats === undefined);
  const { loading: saving, setLoading: setSaving, trySubmit } = useSubmitGuard();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AboutStatsUpdateInput>({
    resolver: zodResolver(aboutStatsUpdateSchema),
    defaultValues: initialStats ?? DEFAULT_ABOUT_STATS,
    mode: "onBlur",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/about-stats", {
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
      if (body?.stats) {
        reset(body.stats);
      }
    } catch {
      setLoadError(tErrors("generic"));
    } finally {
      setLoading(false);
    }
  }, [reset, tErrors]);

  useEffect(() => {
    if (initialStats !== undefined) return;
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
      const res = await fetch("/api/admin/about-stats", {
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
      if (body?.stats) {
        reset(body.stats);
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
          {Array.from({ length: 4 }, (_, i) => (
            <div key={`about-skel-${i}`} className="space-y-2">
              <div className="h-3.5 w-36 animate-pulse rounded bg-muted/80" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
            </div>
          ))}
        </div>

        <div className="h-10 w-36 animate-pulse rounded-lg bg-muted/70" />
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
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
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
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          {t("formTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60">{t("formHint")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="about-years"
          label={t("fields.years")}
          required
          error={errors.years?.message ? t("validation.years") : undefined}
        >
          <Input
            id="about-years"
            type="number"
            step="0.1"
            min={0}
            max={100}
            inputMode="decimal"
            aria-invalid={Boolean(errors.years)}
            {...register("years", { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          id="about-clients"
          label={t("fields.clients")}
          required
          error={errors.clients?.message ? t("validation.clients") : undefined}
        >
          <Input
            id="about-clients"
            type="number"
            step="1"
            min={0}
            max={100000}
            inputMode="numeric"
            aria-invalid={Boolean(errors.clients)}
            {...register("clients", { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          id="about-projects"
          label={t("fields.projects")}
          required
          error={errors.projects?.message ? t("validation.projects") : undefined}
        >
          <Input
            id="about-projects"
            type="number"
            step="1"
            min={0}
            max={100000}
            inputMode="numeric"
            aria-invalid={Boolean(errors.projects)}
            {...register("projects", { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          id="about-response"
          label={t("fields.responseHours")}
          required
          error={
            errors.responseHours?.message
              ? t("validation.responseHours")
              : undefined
          }
        >
          <Input
            id="about-response"
            type="number"
            step="1"
            min={0}
            max={720}
            inputMode="numeric"
            aria-invalid={Boolean(errors.responseHours)}
            {...register("responseHours", { valueAsNumber: true })}
          />
        </FormField>
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
