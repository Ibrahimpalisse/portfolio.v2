import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ABOUT_STATS_LIMITS,
  parseAboutStatsUpdateBody,
} from "@/lib/about/schema";
import {
  aboutStatsToDisplay,
  DEFAULT_ABOUT_STATS,
} from "@/data/about-stats";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    years: 2.5,
    clients: 1,
    projects: 4,
    responseHours: 48,
    ...overrides,
  };
}

describe("parseAboutStatsUpdateBody — validation", () => {
  it("accepte les bornes min/max", () => {
    for (const body of [
      valid({
        years: ABOUT_STATS_LIMITS.years.min,
        clients: ABOUT_STATS_LIMITS.clients.min,
        projects: ABOUT_STATS_LIMITS.projects.min,
        responseHours: ABOUT_STATS_LIMITS.responseHours.min,
      }),
      valid({
        years: ABOUT_STATS_LIMITS.years.max,
        clients: ABOUT_STATS_LIMITS.clients.max,
        projects: ABOUT_STATS_LIMITS.projects.max,
        responseHours: ABOUT_STATS_LIMITS.responseHours.max,
      }),
    ]) {
      assert.equal(parseAboutStatsUpdateBody(body).ok, true);
    }
  });

  it("accepte years = 0 et entiers", () => {
    const parsed = parseAboutStatsUpdateBody(
      valid({ years: 0, clients: 0, projects: 0, responseHours: 0 })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.values.years, 0);
      assert.equal(parsed.values.clients, 0);
    }
  });

  it("arrondit years à 1 décimale (banker half-up via Math.round)", () => {
    const parsed = parseAboutStatsUpdateBody(valid({ years: 2.56 }));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.values.years, 2.6);
  });

  it("rejette hors bornes (chaque champ)", () => {
    const cases = [
      valid({ years: -0.1 }),
      valid({ years: 100.1 }),
      valid({ clients: -1 }),
      valid({ clients: 100_001 }),
      valid({ projects: -1 }),
      valid({ projects: 100_001 }),
      valid({ responseHours: -1 }),
      valid({ responseHours: 721 }),
    ];
    for (const body of cases) {
      assert.equal(parseAboutStatsUpdateBody(body).ok, false, JSON.stringify(body));
    }
  });

  it("rejette non-entier sur clients/projects/responseHours", () => {
    for (const body of [
      valid({ clients: 1.2 }),
      valid({ projects: 3.9 }),
      valid({ responseHours: 24.5 }),
    ]) {
      assert.equal(parseAboutStatsUpdateBody(body).ok, false);
    }
  });

  it("rejette NaN / Infinity / -Infinity (years.finite)", () => {
    for (const years of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.equal(parseAboutStatsUpdateBody(valid({ years })).ok, false, String(years));
    }
  });

  it("rejette types incorrects (type confusion)", () => {
    for (const body of [
      null,
      undefined,
      [],
      "json",
      42,
      valid({ years: "2.5" }),
      valid({ clients: "1" }),
      valid({ projects: true }),
      valid({ responseHours: null }),
      valid({ years: [2.5] }),
      { ...valid(), clients: { $gt: 0 } },
    ]) {
      assert.equal(parseAboutStatsUpdateBody(body).ok, false, String(body));
    }
  });

  it("rejette champs manquants", () => {
    assert.equal(parseAboutStatsUpdateBody({ years: 1, clients: 1, projects: 1 }).ok, false);
    assert.equal(
      parseAboutStatsUpdateBody({ clients: 1, projects: 1, responseHours: 1 }).ok,
      false
    );
  });

  it("ignore / strip les champs inconnus (anti mass-assignment)", () => {
    const parsed = parseAboutStatsUpdateBody({
      ...valid({ years: 3, clients: 9 }),
      id: "hacked",
      status: "admin",
      __proto__: { polluted: true },
      updated_at: "2099-01-01",
      response_hours: 999,
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.values, {
        years: 3,
        clients: 9,
        projects: 4,
        responseHours: 48,
      });
      assert.equal(
        Object.prototype.hasOwnProperty.call(parsed.values, "status"),
        false
      );
      assert.equal(
        Object.prototype.hasOwnProperty.call(parsed.values, "id"),
        false
      );
    }
  });

  it("maxBodyBytes borné pour limiter DoS", () => {
    assert.equal(ABOUT_STATS_LIMITS.maxBodyBytes, 2048);
    assert.ok(ABOUT_STATS_LIMITS.maxBodyBytes < 10_000);
  });
});

describe("aboutStatsToDisplay", () => {
  it("mappe les défauts avec suffixe h", () => {
    assert.deepEqual(aboutStatsToDisplay(DEFAULT_ABOUT_STATS), [
      { id: "years", value: 2.5, decimals: 1 },
      { id: "clients", value: 1, decimals: 0 },
      { id: "projects", value: 4, decimals: 0 },
      { id: "response", value: 48, decimals: 0, suffix: "h" },
    ]);
  });

  it("utilise 0 décimale pour years entier", () => {
    const [years] = aboutStatsToDisplay({
      ...DEFAULT_ABOUT_STATS,
      years: 3,
    });
    assert.equal(years?.decimals, 0);
  });

  it("conserve l'ordre et les 4 ids publics", () => {
    const ids = aboutStatsToDisplay(DEFAULT_ABOUT_STATS).map((s) => s.id);
    assert.deepEqual(ids, ["years", "clients", "projects", "response"]);
  });
});
