import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AdminMfaVerifyValues } from "@/lib/admin/mfa-schema";

export type AdminMfaChallenge = {
  factorId: string;
  challengeId: string;
};

type AuthClientWithSessionGuard = {
  suppressGetSessionWarning: boolean;
};

type AalLevel = "aal1" | "aal2";

/** Active le flag interne auth-js pour éviter le warning proxy session.user (serveur). */
function suppressInsecureSessionUserWarning(supabase: SupabaseClient) {
  (supabase.auth as unknown as AuthClientWithSessionGuard).suppressGetSessionWarning =
    true;
}

/** Décode le claim `aal` d’un JWT déjà validé via getUser() — lecture locale, sans JWKS. */
function readAalFromAccessToken(accessToken: string): AalLevel | null {
  const parts = accessToken.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { aal?: unknown };
    return payload.aal === "aal1" || payload.aal === "aal2" ? payload.aal : null;
  } catch {
    return null;
  }
}

export async function getAdminMfaAssuranceLevel(
  supabase: SupabaseClient,
  knownUser?: User | null
) {
  let user = knownUser ?? null;
  if (!user) {
    // getUser() valide auprès d'Auth — source de confiance serveur.
    const {
      data: { user: fetched },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !fetched) return null;
    user = fetched;
  }

  // getUser a déjà validé le token : lire aal en local (évite getClaims/JWKS lent).
  suppressInsecureSessionUserWarning(supabase);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentLevel = session?.access_token
    ? readAalFromAccessToken(session.access_token)
    : null;
  if (!currentLevel) return null;

  const hasVerifiedFactor =
    user.factors?.some((factor) => factor.status === "verified") ?? false;
  const nextLevel: AalLevel | null = hasVerifiedFactor
    ? "aal2"
    : currentLevel;

  return {
    currentLevel,
    nextLevel,
    currentAuthenticationMethods: [] as string[],
  };
}

/** Session admin complète (mot de passe + TOTP vérifié). */
export async function hasAdminMfaSatisfied(
  supabase: SupabaseClient,
  knownUser?: User | null
): Promise<boolean> {
  const aal = await getAdminMfaAssuranceLevel(supabase, knownUser);
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

export type AdminMfaEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

/** Démarre l'enrôlement TOTP (QR). Nettoie les facteurs non vérifiés restants. */
export async function startAdminMfaEnrollment(
  supabase: SupabaseClient
): Promise<
  | { ok: true; data: AdminMfaEnrollment }
  | { ok: false; error: "already_enrolled" | "enroll_failed" }
> {
  if (await adminHasVerifiedTotp(supabase)) {
    return { ok: false, error: "already_enrolled" };
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const pending = (factorsData?.all ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status === "unverified"
  );

  for (const factor of pending) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Admin portfolio",
  });

  if (error || !data || data.type !== "totp" || !data.totp) {
    return { ok: false, error: "enroll_failed" };
  }

  return {
    ok: true,
    data: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    },
  };
}

/** Confirme l'enrôlement avec le premier code TOTP (challenge + verify). */
export async function confirmAdminMfaEnrollment(
  supabase: SupabaseClient,
  input: { factorId: string; code: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: input.factorId,
  });

  if (challengeError || !challengeData) {
    return { ok: false, error: "challenge_failed" };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: input.factorId,
    challengeId: challengeData.id,
    code: input.code,
  });

  if (verifyError) {
    return { ok: false, error: "invalid_code" };
  }

  return { ok: true };
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
