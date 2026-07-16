import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routing } from "@/i18n/routing";

describe("routing i18n — localePrefix never", () => {
  it("n'affiche jamais /fr /en /ar dans les URLs", () => {
    // next-intl résout localePrefix en mode interne
    assert.equal(routing.localePrefix, "never");
  });

  it("locales autorisées fr, en, ar", () => {
    assert.deepEqual([...routing.locales], ["fr", "en", "ar"]);
    assert.equal(routing.defaultLocale, "fr");
  });
});
