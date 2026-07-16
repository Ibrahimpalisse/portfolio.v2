import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidReviewStatus,
  parseAdminReviewsListQuery,
} from "@/lib/reviews/admin-query";

describe("parseAdminReviewsListQuery", () => {
  it("défaut status=pending", () => {
    const q = parseAdminReviewsListQuery(new URL("http://localhost/api/admin/reviews"));
    assert.equal(q.status, "pending");
    assert.equal(q.limit, 50);
  });

  it("accepte pending|published|rejected|all", () => {
    for (const status of ["pending", "published", "rejected", "all"]) {
      const q = parseAdminReviewsListQuery(
        new URL(`http://localhost/api/admin/reviews?status=${status}`)
      );
      assert.equal(q.status, status);
    }
  });

  it("status injection → pending", () => {
    const q = parseAdminReviewsListQuery(
      new URL("http://localhost/api/admin/reviews?status=pending;drop")
    );
    assert.equal(q.status, "pending");
  });

  it("limit invalide / <=0 → 50", () => {
    assert.equal(
      parseAdminReviewsListQuery(
        new URL("http://localhost/api/admin/reviews?limit=abc")
      ).limit,
      50
    );
    assert.equal(
      parseAdminReviewsListQuery(
        new URL("http://localhost/api/admin/reviews?limit=0")
      ).limit,
      50
    );
    assert.equal(
      parseAdminReviewsListQuery(
        new URL("http://localhost/api/admin/reviews?limit=-3")
      ).limit,
      50
    );
  });

  it("limit numérique valide conservée (borne appliquée côté store)", () => {
    assert.equal(
      parseAdminReviewsListQuery(
        new URL("http://localhost/api/admin/reviews?limit=20")
      ).limit,
      20
    );
  });
});

describe("isValidReviewStatus", () => {
  it("n'accepte que pending|published|rejected", () => {
    assert.equal(isValidReviewStatus("pending"), true);
    assert.equal(isValidReviewStatus("published"), true);
    assert.equal(isValidReviewStatus("rejected"), true);
    assert.equal(isValidReviewStatus("all"), false);
    assert.equal(isValidReviewStatus("unread"), false);
  });
});
