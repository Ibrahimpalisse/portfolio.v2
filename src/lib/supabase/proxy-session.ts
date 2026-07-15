import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdminEmail, isAdminConfigured } from "@/lib/admin/allowlist";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { hasAdminMfaSatisfied } from "@/lib/admin/mfa";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AdminSessionResult = {
  response: NextResponse;
  user: { id: string; email?: string } | null;
};

/**
 * Rafraîchit la session Supabase et protège les routes /admin.
 * À appeler depuis le proxy Next.js.
 */
export async function handleAdminSession(request: NextRequest): Promise<AdminSessionResult> {
  const config = getSupabaseConfig();
  const path = request.nextUrl.pathname;
  const isLoginRoute = path === ADMIN_ROUTES.login;
  const isAdminRoute = path.startsWith("/admin");

  if (!config.ok || !isAdminRoute) {
    return { response: NextResponse.next({ request }), user: null };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.config.url, config.config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminReady = isAdminConfigured();
  const isAdmin = isAllowedAdminEmail(user?.email);

  if (!adminReady && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_ROUTES.login;
    url.searchParams.set("error", "config");
    return { response: NextResponse.redirect(url), user: null };
  }

  if (isLoginRoute) {
    if (user && isAdmin) {
      const mfaOk = await hasAdminMfaSatisfied(supabase);
      if (mfaOk) {
        const url = request.nextUrl.clone();
        url.pathname = ADMIN_ROUTES.home;
        url.search = "";
        return { response: NextResponse.redirect(url), user };
      }

      return { response, user };
    }

    if (user && !isAdmin) {
      await supabase.auth.signOut();
    }

    return { response, user: null };
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_ROUTES.login;
    url.searchParams.set("next", path);
    return { response: NextResponse.redirect(url), user: null };
  }

  if (!isAdmin) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_ROUTES.login;
    url.searchParams.set("error", "unauthorized");
    return { response: NextResponse.redirect(url), user: null };
  }

  const mfaOk = await hasAdminMfaSatisfied(supabase);
  if (!mfaOk) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_ROUTES.login;
    url.searchParams.set("step", "mfa");
    return { response: NextResponse.redirect(url), user };
  }

  return { response, user };
}
