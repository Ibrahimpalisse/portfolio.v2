"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { readAdminApiError } from "@/lib/admin/api-error";
import { getSubmitCooldownMessage, useSubmitGuard } from "@/hooks/use-submit-guard";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import {
  adminMfaVerifySchema,
  type AdminMfaVerifyValues,
} from "@/lib/admin/mfa-schema";

export type AdminMfaChallengeState = {
  factorId: string;
  challengeId: string;
};

type AdminMfaVerifyFormProps = {
  challenge: AdminMfaChallengeState;
  redirectTo?: string;
  onChallengeRefresh: (next: AdminMfaChallengeState) => void;
  onCancel: () => void;
};

export function AdminMfaVerifyForm({
  challenge,
  redirectTo = ADMIN_ROUTES.home,
  onChallengeRefresh,
  onCancel,
}: AdminMfaVerifyFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const { loading, setLoading, trySubmit } = useSubmitGuard();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AdminMfaVerifyValues>({
    resolver: zodResolver(adminMfaVerifySchema),
    defaultValues: {
      code: "",
      factorId: challenge.factorId,
      challengeId: challenge.challengeId,
    },
  });

  const { ref: codeRegisterRef, ...codeRegister } = register("code", {
    setValueAs: (v: string) => String(v ?? "").replace(/\s+/g, ""),
  });

  useEffect(() => {
    codeInputRef.current?.focus();
  }, [challenge.challengeId]);

  const refreshChallenge = async () => {
    const res = await fetch("/api/admin/mfa/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
    });
    const body = (await res.json().catch(() => null)) as {
      factorId?: string;
      challengeId?: string;
      error?: string;
    } | null;

    if (res.ok && body?.factorId && body?.challengeId) {
      const next = { factorId: body.factorId, challengeId: body.challengeId };
      onChallengeRefresh(next);
      reset({ code: "", factorId: next.factorId, challengeId: next.challengeId });
      return true;
    }

    setSubmitError(
      readAdminApiError(res, body, "Session expirée. Reconnectez-vous.")
    );
    return false;
  };

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
      const res = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(values),
      });

      const body = (await res.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
      } | null;

      if (res.ok) {
        router.push(body?.redirectTo ?? redirectTo);
        router.refresh();
        return;
      }

      if (res.status === 429) {
        setSubmitError(readAdminApiError(res, body));
        return;
      }

      if (res.status === 401) {
        const refreshed = await refreshChallenge();
        if (refreshed) {
          setSubmitError(body?.error ?? "Code invalide. Réessayez.");
          return;
        }
      }

      setSubmitError(readAdminApiError(res, body, "Vérification impossible."));
    } catch {
      setSubmitError("Vérification impossible. Réessayez.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      noValidate
      aria-label="Vérification TOTP admin"
    >
      <input type="hidden" {...register("factorId")} />
      <input type="hidden" {...register("challengeId")} />

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground/70">
        <p className="font-medium text-foreground">Étape 2 — Authentification TOTP</p>
        <p className="mt-1">
          Ouvrez votre application d&apos;authentification (Google Authenticator, Authy,
          etc.) et entrez le code à 6 chiffres.
        </p>
      </div>

      {submitError && <FormError message={submitError} />}

      <FormField
        id="admin-mfa-code"
        label="Code à 6 chiffres"
        required
        error={errors.code?.message}
      >
        <Input
          id="admin-mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          className="text-center text-lg tracking-[0.35em]"
          disabled={loading}
          aria-invalid={Boolean(errors.code)}
          aria-describedby={errors.code ? "admin-mfa-code-error" : undefined}
          {...codeRegister}
          ref={(el) => {
            codeRegisterRef(el);
            codeInputRef.current = el;
          }}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 6);
            setValue("code", next, { shouldValidate: true });
          }}
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          "Vérification…"
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Valider le code
          </>
        )}
      </Button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-xs text-foreground/45 transition-colors hover:text-foreground/70"
      >
        ← Retour à la connexion
      </button>
    </form>
  );
}
