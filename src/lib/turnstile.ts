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
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  if (!token || typeof token !== "string") return false;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
      signal: AbortSignal.timeout(FORM_SECURITY.TURNSTILE_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error("[turnstile] siteverify HTTP", res.status);
      return false;
    }

    const data = (await res.json()) as SiteverifyResponse;
    if (!data.success) {
      console.error("[turnstile] verification failed", data["error-codes"]);
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
