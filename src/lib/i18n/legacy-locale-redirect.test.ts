import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redirectLegacyLocalePrefix } from "@/lib/i18n/legacy-locale-redirect";
import { NEXT_LOCALE_COOKIE } from "@/lib/locale-cookie";

describe("redirectLegacyLocalePrefix — URLs sans /fr /en /ar", () => {
  it("ignore les chemins sans préfixe locale", () => {
    const res = redirectLegacyLocalePrefix(
      new Request("http://localhost:3000/projets")
    );
    assert.equal(res, null);
  });

  it("redirige /ar vers / avec cookie ar", () => {
    const res = redirectLegacyLocalePrefix(new Request("http://localhost:3000/ar"));
    assert.ok(res);
    assert.equal(res!.status, 307);
    assert.match(res!.headers.get("location") ?? "", /\/$/);
    const cookie = res!.headers.get("set-cookie") ?? "";
    assert.match(cookie, new RegExp(`${NEXT_LOCALE_COOKIE}=ar`));
  });

  it("redirige /en/projets vers /projets avec cookie en", () => {
    const res = redirectLegacyLocalePrefix(
      new Request("http://localhost:3000/en/projets?x=1")
    );
    assert.ok(res);
    const location = res!.headers.get("location") ?? "";
    assert.match(location, /\/projets\?x=1$/);
    const cookie = res!.headers.get("set-cookie") ?? "";
    assert.match(cookie, new RegExp(`${NEXT_LOCALE_COOKIE}=en`));
  });

  it("redirige /fr/contact vers /contact", () => {
    const res = redirectLegacyLocalePrefix(
      new Request("http://localhost:3000/fr/contact")
    );
    assert.ok(res);
    assert.match(res!.headers.get("location") ?? "", /\/contact$/);
  });

  it("ne confond pas admin avec une locale", () => {
    const res = redirectLegacyLocalePrefix(
      new Request("http://localhost:3000/admin")
    );
    assert.equal(res, null);
  });
});
