import { FORM_SECURITY } from "@/lib/security/constants";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;

  const response = token.trim();
  if (!response) return false;

  try {
    const params = new URLSearchParams({
      secret,
      response,
    });
    // IP optionnelle : une IP mal formée peut faire échouer siteverify.
    if (remoteIp && remoteIp !== "unknown") {
      params.set("remoteip", remoteIp);
    }

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      signal: AbortSignal.timeout(FORM_SECURITY.TURNSTILE_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error("[turnstile] siteverify HTTP", res.status);
      return false;
    }

    const data = (await res.json()) as SiteverifyResponse;
    if (!data.success) {
      const codes = data["error-codes"] ?? [];
      console.error("[turnstile] verification failed", codes);
      // Aide au diagnostic Vercel : secret de test vs token réel, etc.
      if (codes.includes("invalid-input-secret")) {
        console.error(
          "[turnstile] Secret key invalide ou ne correspond pas à la site key du widget"
        );
      }
    }
    return data.success;
  } catch (err) {
    console.error(
      "[turnstile] siteverify error",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
