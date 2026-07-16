"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { HoneypotField } from "@/components/ui/honeypot-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { readAdminApiError } from "@/lib/admin/api-error";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import {
  adminPasswordChangeDefaultValues,
  adminPasswordChangeSchema,
  type AdminPasswordChangeValues,
} from "@/lib/admin/password-change-schema";
import { getSubmitCooldownMessage, useSubmitGuard } from "@/hooks/use-submit-guard";

function PasswordField({
  id,
  label,
  error,
  disabled,
  autoComplete,
  registration,
  showLabel,
  hideLabel,
}: {
  id: string;
  label: string;
  error?: string;
  disabled?: boolean;
  autoComplete: string;
  registration: UseFormRegisterReturn;
  showLabel: string;
  hideLabel: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <FormField id={id} label={label} required error={error}>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          disabled={disabled}
          className="pe-11"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:text-foreground"
          aria-label={show ? hideLabel : showLabel}
        >
          {show ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </FormField>
  );
}

function PasswordChangeFormFields({ onSuccess }: { onSuccess?: () => void }) {
  const t = useTranslations("admin.password");
  const tErrors = useTranslations("admin.errors");
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { loading, setLoading, trySubmit } = useSubmitGuard();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminPasswordChangeValues>({
    resolver: zodResolver(adminPasswordChangeSchema),
    defaultValues: adminPasswordChangeDefaultValues,
    mode: "onBlur",
  });

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

    setLoading(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(values),
      });

      const body = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        redirectTo?: string;
      } | null;

      if (res.ok) {
        setSuccessMessage(body?.message ?? t("success"));
        reset(adminPasswordChangeDefaultValues);
        onSuccess?.();
        window.setTimeout(() => {
          router.push(body?.redirectTo ?? ADMIN_ROUTES.login);
          router.refresh();
        }, 900);
        return;
      }

      setSubmitError(
        readAdminApiError(res, body, tErrors("password_update_failed"), (key) =>
          tErrors(key)
        )
      );
    } catch {
      setSubmitError(tErrors("password_update_failed"));
    } finally {
      setLoading(false);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
      aria-label="Changer le mot de passe admin"
    >
      {submitError && <FormError message={submitError} />}
      {successMessage && (
        <p
          className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          {successMessage}
        </p>
      )}

      <PasswordField
        id="admin-current-password"
        label={t("current")}
        error={errors.currentPassword?.message}
        disabled={loading}
        autoComplete="current-password"
        registration={register("currentPassword")}
        showLabel={t("show")}
        hideLabel={t("hide")}
      />

      <PasswordField
        id="admin-new-password"
        label={t("next")}
        error={errors.newPassword?.message}
        disabled={loading}
        autoComplete="new-password"
        registration={register("newPassword")}
        showLabel={t("show")}
        hideLabel={t("hide")}
      />

      <PasswordField
        id="admin-confirm-password"
        label={t("confirm")}
        error={errors.confirmPassword?.message}
        disabled={loading}
        autoComplete="new-password"
        registration={register("confirmPassword")}
        showLabel={t("show")}
        hideLabel={t("hide")}
      />

      <HoneypotField {...register("_honeypot")} />

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          t("submitting")
        ) : (
          <>
            <Shield className="h-4 w-4" />
            {t("submit")}
          </>
        )}
      </Button>
    </form>
  );
}

/** Bouton header : ouvre la modale de changement de mot de passe. */
export function AdminPasswordChangeButton() {
  const t = useTranslations("admin.password");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <KeyRound className="h-4 w-4" />
          {t("open")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-md"
        closeLabel={t("close")}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("policy")}</DialogDescription>
        </DialogHeader>
        <PasswordChangeFormFields />
      </DialogContent>
    </Dialog>
  );
}
