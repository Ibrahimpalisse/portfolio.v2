import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { adminMfaRequired, startAdminMfaChallenge } from "@/lib/admin/mfa";
import { jsonResponse } from "@/lib/api/json-response";
import { getClientIp } from "@/lib/rate-limit-core";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return jsonResponse({ error: "Service temporairement indisponible." }, 503);
  }

  if (!verifyFormRequestOrigin(request)) {
    return jsonResponse({ error: "Requête non autorisée." }, 403);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAllowedAdminEmail(user.email)) {
      return jsonResponse({ error: "Session expirée. Reconnectez-vous." }, 401);
    }

    const needsMfa = await adminMfaRequired(supabase);
    if (!needsMfa) {
      return jsonResponse({ error: "Vérification déjà effectuée." }, 400);
    }

    const challenge = await startAdminMfaChallenge(supabase);
    if (!challenge.ok) {
      logAdminAuthEvent("mfa_failed", ip, { reason: challenge.error });
      return jsonResponse(
        {
          error:
            "Authentification TOTP non configurée. Activez-la dans Supabase (Authentication → MFA).",
        },
        403
      );
    }

    logAdminAuthEvent("mfa_challenge", ip);
    return jsonResponse(
      {
        ok: true,
        factorId: challenge.data.factorId,
        challengeId: challenge.data.challengeId,
      },
      200
    );
  } catch {
    return jsonResponse({ error: "Impossible de préparer la vérification." }, 502);
  }
}

export function GET() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
