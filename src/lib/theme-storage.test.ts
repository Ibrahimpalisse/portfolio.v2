import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildThemeCookie,
  getServerResolvedTheme,
  parseResolvedTheme,
  parseThemeSetting,
  resolveThemeSetting,
  THEME_COOKIE_MAX_AGE,
  THEME_DEFAULT,
} from "@/lib/theme-storage";

describe("theme-storage — cookies sécurisés", () => {
  it("parseThemeSetting n'accepte que light/dark/system", () => {
    assert.equal(parseThemeSetting("light"), "light");
    assert.equal(parseThemeSetting("dark"), "dark");
    assert.equal(parseThemeSetting("system"), "system");
    assert.equal(parseThemeSetting("invalid"), undefined);
    assert.equal(parseThemeSetting("<script>"), undefined);
  });

  it("getServerResolvedTheme retombe sur le défaut", () => {
    assert.equal(getServerResolvedTheme(undefined), THEME_DEFAULT);
    assert.equal(getServerResolvedTheme("dark"), "dark");
    assert.equal(getServerResolvedTheme("hacked"), THEME_DEFAULT);
  });

  it("buildThemeCookie inclut SameSite=Lax et max-age", () => {
    const cookie = buildThemeCookie("dark");
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, new RegExp(`max-age=${THEME_COOKIE_MAX_AGE}`));
    assert.match(cookie, /portfolio-theme=dark/);
  });

  it("resolveThemeSetting respecte le mode système", () => {
    assert.equal(resolveThemeSetting("system", true, "dark"), "dark");
    assert.equal(resolveThemeSetting("system", false, "dark"), THEME_DEFAULT);
    assert.equal(resolveThemeSetting("light", true, "dark"), "light");
  });

  it("parseResolvedTheme rejette les valeurs arbitraires", () => {
    assert.equal(parseResolvedTheme("javascript:alert(1)"), undefined);
  });
});
