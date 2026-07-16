import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paginateReviews, REVIEWS_PAGE_SIZE } from "@/lib/reviews-config";

describe("paginateReviews", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it("page size défaut = 9", () => {
    assert.equal(REVIEWS_PAGE_SIZE, 9);
    const page1 = paginateReviews(items, 1);
    assert.equal(page1.items.length, 9);
    assert.equal(page1.page, 1);
    assert.equal(page1.total, 23);
    assert.equal(page1.totalPages, 3);
  });

  it("borne page sous / sur min-max", () => {
    assert.equal(paginateReviews(items, 0).page, 1);
    assert.equal(paginateReviews(items, 99).page, 3);
  });

  it("dernière page partielle", () => {
    const last = paginateReviews(items, 3);
    assert.deepEqual(last.items, [19, 20, 21, 22, 23]);
  });

  it("liste vide → 1 page vide", () => {
    const empty = paginateReviews([], 1);
    assert.deepEqual(empty.items, []);
    assert.equal(empty.totalPages, 1);
    assert.equal(empty.total, 0);
  });
});
