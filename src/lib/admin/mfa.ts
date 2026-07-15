import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminMfaVerifyValues } from "@/lib/admin/mfa-schema";

export type AdminMfaChallenge = {
  factorId: string;
  challengeId: string;
};

export async function getAdminMfaAssuranceLevel(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return null;
  return data;
}

/** Session admin complète (mot de passe + TOTP vérifié). */
export async function hasAdminMfaSatisfied(supabase: SupabaseClient): Promise<boolean> {
  const aal = await getAdminMfaAssuranceLevel(supabase);
  if (!aal) return false;
  return aal.currentLevel === "aal2";
}

/** Une étape TOTP est requise après le mot de passe. */
export async function adminMfaRequired(supabase: SupabaseClient): Promise<boolean> {
  const aal = await getAdminMfaAssuranceLevel(supabase);
  if (!aal) return false;
  return aal.currentLevel !== "aal2" && aal.nextLevel === "aal2";
}

/** L'utilisateur doit enrôler un facteur TOTP dans Supabase. */
export async function adminHasVerifiedTotp(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return false;
  return data.totp.some((factor) => factor.status === "verified");
}

export async function startAdminMfaChallenge(
  supabase: SupabaseClient
): Promise<
  | { ok: true; data: AdminMfaChallenge }
  | { ok: false; error: "no_factor" | "challenge_failed" }
> {
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError || !factorsData) {
    return { ok: false, error: "no_factor" };
  }

  const totpFactor = factorsData.totp.find((factor) => factor.status === "verified");
  if (!totpFactor) {
    return { ok: false, error: "no_factor" };
  }

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  });

  if (challengeError || !challengeData) {
    return { ok: false, error: "challenge_failed" };
  }

  return {
    ok: true,
    data: {
      factorId: totpFactor.id,
      challengeId: challengeData.id,
    },
  };
}

export async function verifyAdminTotpCode(
  supabase: SupabaseClient,
  input: AdminMfaVerifyValues
) {
  return supabase.auth.mfa.verify({
    factorId: input.factorId,
    challengeId: input.challengeId,
    code: input.code,
  });
}
