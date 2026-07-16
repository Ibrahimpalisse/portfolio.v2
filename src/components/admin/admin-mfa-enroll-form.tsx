"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { readAdminApiError } from "@/lib/admin/api-error";
import { getSubmitCooldownMessage, useSubmitGuard } from "@/hooks/use-submit-guard";
import { ADMIN_ROUTES } from "@/lib/admin/constants";

const enrollCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Entrez le code à 6 chiffres affiché dans l'application."),
});

type EnrollCodeValues = z.infer<typeof enrollCodeSchema>;

type EnrollmentData = {
  factorId: string;
  qrCode: string;
};

type AdminMfaEnrollFormProps = {
  redirectTo?: string;
  onCancel: () => void;
};

export function AdminMfaEnrollForm({
  redirectTo = ADMIN_ROUTES.home,
  onCancel,
}: AdminMfaEnrollFormProps) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [scanned, setScanned] = useState(false);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const { loading, setLoading, trySubmit } = useSubmitGuard();
  const [booting, setBooting] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EnrollCodeValues>({
    resolver: zodResolver(enrollCodeSchema),
    defaultValues: { code: "" },
  });

  const { ref: codeRegisterRef, ...codeRegister } = register("code");

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBooting(true);
      setLoadError("");
      try {
        const res = await fetch("/api/admin/mfa/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
        });
        const body = (await res.json().catch(() => null)) as {
          error?: string;
          factorId?: string;
          qrCode?: string;
        } | null;

        if (cancelled) return;

        if (!res.ok || !body?.factorId || !body.qrCode) {
          setLoadError(
            readAdminApiError(res, body, "Impossible de générer le QR. Reconnectez-vous.")
          );
          return;
        }

        setEnrollment({
          factorId: body.factorId,
          qrCode: body.qrCode,
        });
      } catch {
        if (!cancelled) {
          setLoadError("Impossible de générer le QR. Réessayez.");
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (scanned) codeInputRef.current?.focus();
  }, [scanned]);

  const onSubmit = handleSubmit(async (values) => {
    if (!enrollment) return;
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
      const res = await fetch("/api/admin/mfa/enroll/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          factorId: enrollment.factorId,
          code: values.code,
        }),
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

      setSubmitError(readAdminApiError(res, body, "Code invalide. Réessayez."));
    } catch {
      setSubmitError("Validation impossible. Réessayez.");
    } finally {
      setLoading(false);
    }
  });

  if (booting) {
    return (
      <div className="space-y-3 text-center text-sm text-foreground/60">
        <div className="mx-auto h-40 w-40 animate-pulse rounded-xl bg-muted/50" />
        <p>Génération du QR TOTP…</p>
      </div>
    );
  }

  if (loadError || !enrollment) {
    return (
      <div className="space-y-4">
        <FormError message={loadError || "Enrôlement indisponible."} />
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-xs text-foreground/45 transition-colors hover:text-foreground/70"
        >
          ← Retour à la connexion
        </button>
      </div>
    );
  }

  if (!scanned) {
    return (
      <div className="space-y-5" aria-label="Scan QR TOTP admin">
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground/70">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <QrCode className="h-4 w-4 text-step-accent" aria-hidden />
            Étape 1 — Scanner le QR
          </p>
          <p className="mt-1">
            Ouvrez Google Authenticator, Authy ou une app compatible, puis scannez ce
            code.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="QR code TOTP admin"
            className="h-44 w-44 rounded-xl border border-border bg-white p-2"
          />
        </div>

        <Button type="button" className="w-full" onClick={() => setScanned(true)}>
          J&apos;ai scanné le QR
        </Button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-xs text-foreground/45 transition-colors hover:text-foreground/70"
        >
          ← Annuler et se déconnecter
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      noValidate
      aria-label="Confirmation code TOTP admin"
    >
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground/70">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-step-accent" aria-hidden />
          Étape 2 — Entrer le code
        </p>
        <p className="mt-1">
          Saisissez le code à 6 chiffres affiché dans votre application
          d&apos;authentification.
        </p>
      </div>

      {submitError && <FormError message={submitError} />}

      <FormField
        id="admin-enroll-code"
        label="Code à 6 chiffres"
        required
        error={errors.code?.message}
      >
        <Input
          id="admin-enroll-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          className="text-center text-lg tracking-[0.35em]"
          disabled={loading}
          aria-invalid={Boolean(errors.code)}
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
          "Activation…"
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Activer le 2FA
          </>
        )}
      </Button>

      <button
        type="button"
        onClick={() => {
          setScanned(false);
          setSubmitError("");
          setValue("code", "");
        }}
        className="w-full text-center text-xs text-foreground/45 transition-colors hover:text-foreground/70"
      >
        ← Revoir le QR code
      </button>
    </form>
  );
}
