import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { adminMfaRequired, startAdminMfaChallenge } from "@/lib/admin/mfa";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion admin",
  robots: { index: false, follow: false },
};

function LoginFallback() {
  return (
    <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/40" />
  );
}

type AdminLoginPageProps = {
  searchParams: Promise<{ step?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const configured = isSupabaseConfigured() && isAdminConfigured();

  let initialMfaChallenge: { factorId: string; challengeId: string } | null = null;

  if (configured && params.step === "mfa") {
    const user = await getAuthenticatedUser();
    if (user && isAllowedAdminEmail(user.email)) {
      const supabase = await createSupabaseServerClient();
      if (await adminMfaRequired(supabase)) {
        const challenge = await startAdminMfaChallenge(supabase);
        if (challenge.ok) {
          initialMfaChallenge = challenge.data;
        }
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Connexion admin</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Authentification sécurisée · mot de passe + TOTP
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <Suspense fallback={<LoginFallback />}>
          <AdminLoginForm
            configured={configured}
            initialMfaChallenge={initialMfaChallenge}
          />
        </Suspense>
      </div>
    </div>
  );
}
