import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { createPageMetadata, routes } from "@/lib/routes";

describe("SEO — sitemap & robots", () => {
  it("sitemap inclut l’accueil et les pages indexables (sans /services ni /a-propos)", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    assert.ok(urls.some((u) => /\/projets$/.test(u)));
    assert.ok(urls.some((u) => /\/avis$/.test(u)));
    assert.equal(
      urls.some((u) => u.includes("/services")),
      false
    );
    assert.equal(
      urls.some((u) => u.includes("/a-propos")),
      false
    );
    assert.equal(
      urls.some((u) => u.includes("laisser-un-avis")),
      false
    );
    assert.equal(urls.some((u) => u.includes("/admin")), false);
  });

  it("robots bloque admin et laisser-un-avis", () => {
    const r = robots();
    const disallow = Array.isArray(r.rules)
      ? r.rules.flatMap((x) => x.disallow ?? [])
      : r.rules.disallow ?? [];
    const list = Array.isArray(disallow) ? disallow : [disallow];
    assert.ok(list.some((d) => String(d).includes("admin")));
    assert.ok(list.some((d) => String(d).includes("laisser-un-avis")));
    assert.ok(String(r.sitemap).endsWith("/sitemap.xml"));
  });

  it("createPageMetadata expose canonical + twitter + OG", () => {
    const meta = createPageMetadata({
      title: "Test",
      description: "Desc",
      path: routes.projects,
    });
    assert.equal(
      meta.alternates?.canonical?.toString().includes("/projets"),
      true
    );
    assert.equal(meta.twitter?.card, "summary_large_image");
    assert.equal(meta.openGraph?.url?.toString().includes("/projets"), true);
  });

  it("leave-review est noindex via metadata helper", () => {
    const meta = createPageMetadata({
      title: "x",
      description: "y",
      path: routes.leaveReview,
      index: false,
    });
    assert.deepEqual(meta.robots, { index: false, follow: false });
  });
});
