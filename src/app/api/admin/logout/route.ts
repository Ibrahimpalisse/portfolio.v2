import { jsonResponse } from "@/lib/api/json-response";
import { logAdminAuthEvent } from "@/lib/admin/audit-log";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { getClientIp } from "@/lib/rate-limit-core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!verifyFormRequestOrigin(request)) {
    return jsonResponse({ error: "Requête non autorisée." }, 403);
  }

  if (!isSupabaseConfigured()) {
    return jsonResponse({ error: "Service temporairement indisponible." }, 503);
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    logAdminAuthEvent("logout", ip);
    return jsonResponse({ ok: true, redirectTo: ADMIN_ROUTES.login }, 200);
  } catch {
    return jsonResponse({ error: "Déconnexion impossible." }, 502);
  }
}

export function GET() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
