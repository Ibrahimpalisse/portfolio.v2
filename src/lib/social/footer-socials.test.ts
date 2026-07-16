import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFooterSocials } from "@/lib/brand";

describe("buildFooterSocials", () => {
  it("marque Discord comme preferred", () => {
    const links = buildFooterSocials({
      discord: "https://discord.gg/x",
      whatsapp: "",
      instagram: "",
      tiktok: "",
    });
    const discord = links.find((l) => l.id === "discord");
    assert.equal(discord?.preferred, true);
    assert.equal(discord?.href, "https://discord.gg/x");
  });

  it("conserve les href vides (masqués côté UI)", () => {
    const links = buildFooterSocials({
      discord: "",
      whatsapp: "",
      instagram: "",
      tiktok: "",
    });
    assert.equal(links.length, 4);
    assert.ok(links.every((l) => l.href === ""));
  });
});
