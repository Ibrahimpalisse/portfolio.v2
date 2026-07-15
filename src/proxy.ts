import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimitInStore,
  getClientIp,
  pruneRateLimitStore,
} from "@/lib/rate-limit-core";
import { ADMIN_LOGIN_LIMITS } from "@/lib/admin/constants";
import { handleAdminSession } from "@/lib/supabase/proxy-session";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const formStore = new Map<string, RateLimitEntry>();
const loginStore = new Map<string, RateLimitEntry>();

function formRateLimitResponse(retryAfterSec?: number) {
  return NextResponse.json(
    { error: "Trop de tentatives. Réessayez plus tard." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfterSec ? { "Retry-After": String(retryAfterSec) } : {}),
      },
    }
  );
}

function loginRateLimitResponse(retryAfterSec?: number) {
  return NextResponse.json(
    { error: "Trop de tentatives de connexion. Réessayez plus tard." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfterSec ? { "Retry-After": String(retryAfterSec) } : {}),
      },
    }
  );
}

function handleFormRateLimit(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405, headers: { "Cache-Control": "no-store" } }
    );
  }

  pruneRateLimitStore(formStore);

  const ip = getClientIp(request);
  const path = request.nextUrl.pathname;
  const rateKey = path.includes("/contact") ? `contact:${ip}` : `review:${ip}`;
  const rate = checkRateLimitInStore(formStore, rateKey);

  if (!rate.allowed) {
    return formRateLimitResponse(rate.retryAfterSec);
  }

  return NextResponse.next();
}

function handleAdminLoginRateLimit(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  pruneRateLimitStore(loginStore);

  const ip = getClientIp(request);
  const rate = checkRateLimitInStore(
    loginStore,
    `admin-login:${ip}`,
    Date.now(),
    ADMIN_LOGIN_LIMITS.windowMs,
    ADMIN_LOGIN_LIMITS.maxAttempts
  );

  if (!rate.allowed) {
    return loginRateLimitResponse(rate.retryAfterSec);
  }

  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === "/api/contact" || path === "/api/review") {
    return handleFormRateLimit(request);
  }

  if (path === "/api/admin/login" || path === "/api/admin/mfa/verify") {
    const rateResponse = handleAdminLoginRateLimit(request);
    if (rateResponse.status === 429) return rateResponse;
  }

  if (path.startsWith("/admin")) {
    const { response } = await handleAdminSession(request);
    return response;
  }

  if (
    !path.startsWith("/api") &&
    !path.startsWith("/_next") &&
    !path.includes(".")
  ) {
    return handleI18nRouting(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/contact",
    "/api/review",
    "/api/admin/login",
    "/api/admin/mfa/verify",
    "/api/admin/mfa/challenge",
    "/admin/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
