import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { parseReviewPayload } from "@/lib/review-schema";
import { clearContactDailyLimitsForTests } from "@/lib/security/contact-daily-limit";
import { clearReviewDailyLimitsForTests } from "@/lib/security/review-daily-limit";
import { ValidationErrors } from "@/lib/validation-errors";

const envBackup = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined) {
  if (!envBackup.has(key)) envBackup.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function restoreEnv() {
  for (const [key, value] of envBackup.entries()) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  envBackup.clear();
}

function formRequest(
  body: unknown,
  options?: { ip?: string; origin?: string }
): Request {
  return new Request("http://localhost:3000/api/review", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: options?.origin ?? "http://localhost:3000",
      "user-agent": "vitest-review-agent",
      ...(options?.ip ? { "x-forwarded-for": options.ip } : {}),
    },
    body: JSON.stringify(body),
  });
}

function validBody(email: string, overrides: Record<string, unknown> = {}) {
  return {
    name: "Jean Dupont",
    email,
    role: "Fondateur",
    rating: 5,
    message: "Excellent travail, très professionnel et à l'écoute.",
    _honeypot: "",
    ...overrides,
  };
}

describe("POST /api/review — persist, unicité, rate-limit IP", () => {
  let serviceConfigured = true;
  let saveResult:
    | { ok: true; id: string; duplicate?: boolean }
    | { ok: false; reason?: "duplicate_email" | "persist_failed" | "not_configured" } =
    { ok: true, id: "rev-1" };
  let lastSaveInput: unknown = null;
  let reviewRoute: typeof import("@/app/api/review/route");

  before(() => {
    mock.module("@/lib/supabase/service", {
      namedExports: {
        isSupabaseServiceConfigured: () => serviceConfigured,
        createSupabaseServiceClient: () => null,
      },
    });

    mock.module("@/lib/reviews/store", {
      namedExports: {
        saveReview: async (input: unknown) => {
          lastSaveInput = input;
          return saveResult;
        },
        listReviews: async () => [],
        countReviewsByStatus: async () => 0,
        updateReviewStatus: async () => false,
        deleteReview: async () => false,
        getPublishedReviews: async () => [],
        findActiveReviewByEmail: async () => null,
        countReviewsInWindow: async () => null,
        reviewRowToItem: () => ({
          id: "x",
          name: "",
          role: "",
          text: "",
          rating: 5,
        }),
      },
    });

    mock.module("@/lib/email/send-review-email", {
      namedExports: {
        sendReviewEmail: async () => ({ ok: false, reason: "not_configured" }),
      },
    });
  });

  before(async () => {
    reviewRoute = await import("@/app/api/review/route");
  });

  after(() => {
    mock.reset();
    restoreEnv();
  });

  beforeEach(() => {
    setEnv("FORM_REQUIRE_TURNSTILE", "false");
    setEnv("TURNSTILE_SECRET_KEY", undefined);
    setEnv("NODE_ENV", "test");
    clearContactDailyLimitsForTests();
    clearReviewDailyLimitsForTests();
    serviceConfigured = true;
    saveResult = { ok: true, id: "rev-1" };
    lastSaveInput = null;
  });

  it("persiste via saveReview et retourne stored si Resend down", async () => {
    const email = `persist-${Date.now()}@example.com`;
    const res = await reviewRoute.POST(
      formRequest(validBody(email), { ip: "203.0.113.201" })
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok?: boolean; stored?: boolean };
    assert.equal(body.ok, true);
    assert.equal(body.stored, true);
    const saved = lastSaveInput as {
      email: string;
      rating: number;
      fingerprint: string;
      ip: string;
      userAgent: string | null;
    };
    assert.equal(saved.email, email);
    assert.equal(saved.rating, 5);
    assert.ok(saved.fingerprint.length > 0);
    assert.equal(saved.userAgent, "vitest-review-agent");
  });

  it("409 reviewAlreadySubmitted si email déjà actif", async () => {
    saveResult = { ok: false, reason: "duplicate_email" };
    const res = await reviewRoute.POST(
      formRequest(validBody(`dup-${Date.now()}@example.com`), {
        ip: "203.0.113.202",
      })
    );
    assert.equal(res.status, 409);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, ValidationErrors.reviewAlreadySubmitted);
  });

  it("n'appelle pas save si service non configuré → 503", async () => {
    serviceConfigured = false;
    const res = await reviewRoute.POST(
      formRequest(validBody(`noconf-${Date.now()}@example.com`), {
        ip: "203.0.113.203",
      })
    );
    assert.equal(res.status, 503);
    assert.equal(lastSaveInput, null);
  });

  it("si save échoue (persist) et Resend down → 503", async () => {
    saveResult = { ok: false, reason: "persist_failed" };
    const res = await reviewRoute.POST(
      formRequest(validBody(`fail-${Date.now()}@example.com`), {
        ip: "203.0.113.204",
      })
    );
    assert.equal(res.status, 503);
  });

  it("payload invalide n'atteint pas save", async () => {
    const res = await reviewRoute.POST(
      formRequest({
        name: "A",
        email: "bad",
        rating: 5,
        message: "x",
        _honeypot: "",
      })
    );
    assert.equal(res.status, 400);
    assert.equal(lastSaveInput, null);
  });

  it("email manquant n'atteint pas save", async () => {
    const res = await reviewRoute.POST(
      formRequest({
        name: "Jean Dupont",
        rating: 5,
        message: "Message assez long pour validation.",
        _honeypot: "",
      })
    );
    assert.equal(res.status, 400);
    assert.equal(lastSaveInput, null);
  });

  it("429 reviewIpRateLimited après REVIEW_IP_DAILY_MAX", async () => {
    const { FORM_SECURITY } = await import("@/lib/security/constants");
    const sharedIp = "198.51.100.77";
    for (let i = 0; i < FORM_SECURITY.REVIEW_IP_DAILY_MAX; i += 1) {
      const res = await reviewRoute.POST(
        formRequest(validBody(`ipok-${Date.now()}-${i}@example.com`), {
          ip: sharedIp,
        })
      );
      assert.equal(res.status, 200, `allowed ${i + 1}`);
    }
    const blocked = await reviewRoute.POST(
      formRequest(validBody(`ipblock-${Date.now()}@example.com`), {
        ip: sharedIp,
      })
    );
    assert.equal(blocked.status, 429);
    const body = (await blocked.json()) as { error?: string };
    assert.equal(body.error, ValidationErrors.reviewIpRateLimited);
    assert.ok(blocked.headers.get("Retry-After"));
  });

  it("GET review → 405", () => {
    assert.equal(reviewRoute.GET().status, 405);
  });

  it("parseReviewPayload aligné avec email normalisé pour save", () => {
    const parsed = parseReviewPayload(
      validBody("  Mix@Example.COM ", { rating: 4 })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.data.email, "mix@example.com");
      assert.equal(parsed.data.rating, 4);
    }
  });
});
