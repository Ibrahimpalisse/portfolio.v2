import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROJECT_BUSINESS_TYPE_DEFS,
  PROJECT_BUSINESS_TYPE_IDS,
  getProjectBusinessTypeDef,
  isProjectBusinessTypeId,
  resolveProjectBusinessTypeLabels,
} from "@/data/project-business-types";

describe("project-business-types catalogue", () => {
  it("contient les ids attendus sans doublon", () => {
    const ids = PROJECT_BUSINESS_TYPE_DEFS.map((d) => d.id);
    assert.deepEqual(ids, [...PROJECT_BUSINESS_TYPE_IDS]);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes("showcase"));
    assert.ok(ids.includes("other"));
    assert.ok(ids.length >= 8);
  });

  it("isProjectBusinessTypeId whitelist stricte", () => {
    for (const id of PROJECT_BUSINESS_TYPE_IDS) {
      assert.equal(isProjectBusinessTypeId(id), true, id);
    }
    assert.equal(isProjectBusinessTypeId("react"), false);
    assert.equal(isProjectBusinessTypeId("SHOWCASE"), false);
    assert.equal(isProjectBusinessTypeId(""), false);
    assert.equal(isProjectBusinessTypeId("../showcase"), false);
    assert.equal(isProjectBusinessTypeId("showcase "), false);
  });

  it("getProjectBusinessTypeDef / labels ignorent les ids inconnus", () => {
    assert.equal(getProjectBusinessTypeDef("dashboard")?.label, "Tableau de bord");
    assert.equal(getProjectBusinessTypeDef("nope"), undefined);
    assert.deepEqual(
      resolveProjectBusinessTypeLabels(["showcase", "hacked", "webapp"]),
      ["Site vitrine", "Application web"]
    );
  });
});
