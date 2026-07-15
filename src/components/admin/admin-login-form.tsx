"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { HoneypotField } from "@/components/ui/honeypot-field";
import {
  AdminMfaVerifyForm,
  type AdminMfaChallengeState,
} from "@/components/admin/admin-mfa-verify-form";
import { getSubmitCooldownMessage, useSubmitGuard } from "@/hooks/use-submit-guard";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import {
  adminLoginDefaultValues,
  adminLoginSchema,
  type AdminLoginValues,
} from "@/lib/admin/login-schema";

type AdminLoginFormProps = {
  configured: boolean;
  initialMfaChallenge?: AdminMfaChallengeState | null;
};

export function AdminLoginForm({ configured, initialMfaChallenge }: AdminLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<AdminMfaChallengeState | null>(
    initialMfaChallenge ?? null
  );
  const { loading, setLoading, trySubmit } = useSubmitGuard();

  const errorParam = searchParams.get("error");
  const configError =
    errorParam === "config"
      ? "Espace admin non configuré (Supabase ou liste blanche d'emails)."
      : errorParam === "unauthorized"
        ? "Ce compte n'est pas autorisé à accéder à l'administration."
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

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");

    const guard = trySubmit();
    if (!guard.allowed) {
      if (guard.reason === "cooldown") {
        setSubmitError(getSubmitCooldownMessage());
      }
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(values),
      });

      const body = (await res.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
        mfaRequired?: boolean;
        factorId?: string;
        challengeId?: string;
      } | null;

      if (res.ok && body?.mfaRequired && body.factorId && body.challengeId) {
        setMfaChallenge({
          factorId: body.factorId,
          challengeId: body.challengeId,
        });
        return;
      }

      if (res.ok) {
        router.push(body?.redirectTo ?? ADMIN_ROUTES.home);
        router.refresh();
        return;
      }

      setSubmitError(body?.error ?? "Connexion impossible.");
    } catch {
      setSubmitError("Connexion impossible. Réessayez.");
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
    router.replace(ADMIN_ROUTES.login);
    router.refresh();
  };

  if (!configured) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-foreground/70">
        <p>
          L&apos;authentification admin n&apos;est pas encore configurée. Ajoutez les
          variables Supabase et <code className="text-xs">ADMIN_ALLOWED_EMAILS</code> dans{" "}
          <code className="text-xs">.env.local</code>, puis créez l&apos;utilisateur dans le
          dashboard Supabase avec l&apos;authentification TOTP (MFA).
        </p>
      </div>
    );
  }

  if (mfaChallenge) {
    return (
      <AdminMfaVerifyForm
        challenge={mfaChallenge}
        onChallengeRefresh={setMfaChallenge}
        onCancel={handleMfaCancel}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {configError && <FormError message={configError} />}
      {submitError && <FormError message={submitError} />}

      <FormField id="admin-email" label="Email" error={errors.email?.message}>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          inputMode="email"
          spellCheck={false}
          disabled={loading}
          {...register("email")}
        />
      </FormField>

      <FormField
        id="admin-password"
        label="Mot de passe"
        error={errors.password?.message}
      >
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          disabled={loading}
          {...register("password")}
        />
      </FormField>

      <HoneypotField {...register("_honeypot")} />

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          "Connexion…"
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Continuer
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-foreground/45">
        <Lock className="h-3.5 w-3.5" />
        Supabase · mot de passe + TOTP (2FA)
      </p>
    </form>
  );
}
