"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { HoneypotField } from "@/components/ui/honeypot-field";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/turnstile-widget";
import {
  AdminMfaVerifyForm,
  type AdminMfaChallengeState,
} from "@/components/admin/admin-mfa-verify-form";
import { AdminMfaEnrollForm } from "@/components/admin/admin-mfa-enroll-form";
import { readAdminApiError } from "@/lib/admin/api-error";
import { getSafeAdminNextPath } from "@/lib/admin/safe-next";
import { getSubmitCooldownMessage, useSubmitGuard } from "@/hooks/use-submit-guard";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import {
  adminLoginDefaultValues,
  adminLoginSchema,
  type AdminLoginValues,
} from "@/lib/admin/login-schema";

const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

type AdminLoginFormProps = {
  configured: boolean;
  initialMfaChallenge?: AdminMfaChallengeState | null;
  initialNeedsEnrollment?: boolean;
};

export function AdminLoginForm({
  configured,
  initialMfaChallenge,
  initialNeedsEnrollment = false,
}: AdminLoginFormProps) {
  const t = useTranslations("admin.login");
  const tErrors = useTranslations("admin.errors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [mfaChallenge, setMfaChallenge] = useState<AdminMfaChallengeState | null>(
    initialMfaChallenge ?? null
  );
  const [needsEnrollment, setNeedsEnrollment] = useState(initialNeedsEnrollment);
  const { loading, setLoading, trySubmit } = useSubmitGuard();

  const errorParam = searchParams.get("error");
  const safeNext = getSafeAdminNextPath(searchParams.get("next"));

  const configError =
    errorParam === "config"
      ? t("errorConfig")
      : errorParam === "unauthorized"
        ? t("errorUnauthorized")
        : "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: adminLoginDefaultValues,
    mode: "onBlur",
  });

  const resolveRedirect = (apiRedirect?: string) =>
    safeNext ?? apiRedirect ?? ADMIN_ROUTES.home;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");

    const guard = trySubmit();
    if (!guard.allowed) {
      if (guard.reason === "cooldown") {
        setSubmitError(tErrors("cooldown") || getSubmitCooldownMessage());
      }
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      setSubmitError(tErrors("turnstile_failed"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          _honeypot: values._honeypot ?? "",
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
        mfaRequired?: boolean;
        mfaEnrollmentRequired?: boolean;
        factorId?: string;
        challengeId?: string;
      } | null;

      if (res.ok && body?.mfaEnrollmentRequired) {
        setNeedsEnrollment(true);
        const params = new URLSearchParams();
        params.set("step", "enroll");
        if (safeNext) params.set("next", safeNext);
        router.replace(`${ADMIN_ROUTES.login}?${params.toString()}`);
        return;
      }

      if (res.ok && body?.mfaRequired && body.factorId && body.challengeId) {
        setMfaChallenge({
          factorId: body.factorId,
          challengeId: body.challengeId,
        });
        const params = new URLSearchParams();
        params.set("step", "mfa");
        if (safeNext) params.set("next", safeNext);
        router.replace(`${ADMIN_ROUTES.login}?${params.toString()}`);
        return;
      }

      if (res.ok) {
        router.push(resolveRedirect(body?.redirectTo));
        router.refresh();
        return;
      }

      setSubmitError(
        readAdminApiError(res, body, tErrors("generic"), (key) => tErrors(key))
      );
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } catch {
      setSubmitError(tErrors("generic"));
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  });

  const handleMfaCancel = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
    }).catch(() => null);
    setMfaChallenge(null);
    setNeedsEnrollment(false);
    router.replace(ADMIN_ROUTES.login);
    router.refresh();
  };

  if (!configured) {
    return (
      <div className="space-y-4 text-sm text-foreground/70">
        <p className="font-medium text-foreground">{t("configTitle")}</p>
        <ul className="list-inside list-disc space-y-1.5 text-foreground/60">
          <li>{t("configHint1")}</li>
          <li>{t("configHint2")}</li>
          <li>{t("configHint3")}</li>
        </ul>
      </div>
    );
  }

  if (needsEnrollment) {
    return (
      <AdminMfaEnrollForm
        redirectTo={safeNext ?? ADMIN_ROUTES.home}
        onCancel={handleMfaCancel}
      />
    );
  }

  if (mfaChallenge) {
    return (
      <AdminMfaVerifyForm
        challenge={mfaChallenge}
        redirectTo={safeNext ?? ADMIN_ROUTES.home}
        onChallengeRefresh={setMfaChallenge}
        onCancel={handleMfaCancel}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate aria-label={t("aria")}>
      {configError && <FormError message={configError} />}
      {submitError && <FormError message={submitError} />}

      <FormField id="admin-email" label={t("email")} required error={errors.email?.message}>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          disabled={loading}
          autoFocus
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "admin-email-error" : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField
        id="admin-password"
        label={t("password")}
        required
        error={errors.password?.message}
      >
        <div className="relative">
          <Input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            disabled={loading}
            className="pe-11"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "admin-password-error" : undefined}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:text-foreground"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </FormField>

      <HoneypotField {...register("_honeypot")} />

      {turnstileEnabled && (
        <TurnstileWidget
          ref={turnstileRef}
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken("")}
        />
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          t("connecting")
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            {t("continue")}
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-foreground/45">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        {t("footer")}
      </p>
    </form>
  );
}