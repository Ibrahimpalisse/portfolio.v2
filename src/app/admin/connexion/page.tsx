import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shield } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { getAdminLocale } from "@/lib/admin/i18n";
import {
  adminHasVerifiedTotp,
  adminMfaRequired,
  startAdminMfaChallenge,
} from "@/lib/admin/mfa";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "admin.meta" });
  return {
    title: t("loginTitle"),
    robots: { index: false, follow: false },
  };
}

function LoginFallback() {
  return (
    <div className="h-56 animate-pulse rounded-2xl border border-border bg-muted/40" />
  );
}

type AdminLoginPageProps = {
  searchParams: Promise<{ step?: string; next?: string; error?: string }>;
};

async function AuthStepIndicator({
  step,
}: {
  step: "login" | "enroll" | "mfa";
}) {
  const t = await getTranslations("admin.login");
  const secondActive = step === "enroll" || step === "mfa";
  const secondLabel = step === "enroll" ? t("stepEnroll") : t("stepMfa");

  return (
    <ol className="mx-auto mb-8 flex max-w-sm items-center justify-center gap-2 text-xs">
      <li
        className={
          secondActive
            ? "rounded-full border border-border px-3 py-1 text-foreground/45"
            : "rounded-full border border-step-accent/40 bg-step-accent/10 px-3 py-1 font-medium text-step-accent"
        }
      >
        {t("stepCredentials")}
      </li>
      <li aria-hidden className="text-foreground/30">
        →
      </li>
      <li
        className={
          secondActive
            ? "rounded-full border border-step-accent/40 bg-step-accent/10 px-3 py-1 font-medium text-step-accent"
            : "rounded-full border border-border px-3 py-1 text-foreground/45"
        }
      >
        {secondLabel}
      </li>
    </ol>
  );
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const locale = await getAdminLocale();
  setRequestLocale(locale);
  const t = await getTranslations("admin.login");
  const params = await searchParams;
  const configured = isSupabaseConfigured() && isAdminConfigured();
  const stepParam = params.step;

  let initialMfaChallenge: { factorId: string; challengeId: string } | null = null;
  let initialNeedsEnrollment = stepParam === "enroll";
  let uiStep: "login" | "enroll" | "mfa" = "login";

  if (configured && (stepParam === "mfa" || stepParam === "enroll")) {
    const user = await getAuthenticatedUser();
    if (user && isAllowedAdminEmail(user.email)) {
      const supabase = await createSupabaseServerClient();
      const hasTotp = await adminHasVerifiedTotp(supabase);

      if (!hasTotp) {
        initialNeedsEnrollment = true;
        uiStep = "enroll";
      } else if (await adminMfaRequired(supabase)) {
        const challenge = await startAdminMfaChallenge(supabase);
        if (challenge.ok) {
          initialMfaChallenge = challenge.data;
          uiStep = "mfa";
          initialNeedsEnrollment = false;
        }
      }
    }
  }

  if (initialMfaChallenge) uiStep = "mfa";
  if (initialNeedsEnrollment) uiStep = "enroll";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-4">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-step-accent/30 bg-background/60 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-step-accent">
          <Shield className="h-3.5 w-3.5" aria-hidden />
          {t("secureSpace")}
        </span>
        <h1 className="mt-4 font-display-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-foreground/60">{t("subtitle")}</p>
      </div>

      <AuthStepIndicator step={uiStep} />

      <div className="rounded-2xl border border-step-accent/20 bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <Suspense fallback={<LoginFallback />}>
          <AdminLoginForm
            configured={configured}
            initialMfaChallenge={initialMfaChallenge}
            initialNeedsEnrollment={initialNeedsEnrollment}
          />
        </Suspense>
      </div>
    </div>
  );
}
