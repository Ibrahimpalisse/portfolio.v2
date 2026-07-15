import { isTurnstileEnabled } from "@/lib/turnstile";

function readBoolEnv(name: string): boolean | undefined {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Turnstile obligatoire en production par défaut.
 * Désactiver explicitement avec FORM_REQUIRE_TURNSTILE=false (dev/staging uniquement).
 */
export function isTurnstileRequired(): boolean {
  const explicit = readBoolEnv("FORM_REQUIRE_TURNSTILE");
  if (explicit !== undefined) return explicit;
  return process.env.NODE_ENV === "production";
}

export function getTurnstileGuardFailure(): "missing_config" | null {
  if (!isTurnstileRequired()) return null;
  if (isTurnstileEnabled()) return null;
  return "missing_config";
}
