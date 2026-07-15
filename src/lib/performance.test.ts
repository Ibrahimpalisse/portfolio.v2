import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { performance } from "node:perf_hooks";
import { sanitizeText, sanitizePersonName, isValidEmail } from "@/lib/form-validation";
import { escapeHtml } from "@/lib/email/escape-html";
import { createSubmissionFingerprint } from "@/lib/security/fingerprint";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { paginateReviews } from "@/lib/reviews-config";

const ITERATIONS = 5_000;
const MAX_MS = 500;

function assertPerf(label: string, fn: () => void, maxMs = MAX_MS) {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i += 1) fn();
  const elapsed = performance.now() - start;
  assert.ok(
    elapsed < maxMs,
    `${label}: ${elapsed.toFixed(1)}ms pour ${ITERATIONS} itérations (max ${maxMs}ms)`
  );
}

describe("Performance — chemins chauds", () => {
  it("sanitizeText reste rapide", () => {
    const input = "  Hello world with some text to sanitize  ";
    assertPerf("sanitizeText", () => sanitizeText(input, 100));
  });

  it("sanitizePersonName reste rapide", () => {
    const input = "Jean Dupont <script>alert(1)</script>";
    assertPerf("sanitizePersonName", () => sanitizePersonName(input, 100));
  });

  it("isValidEmail reste rapide", () => {
    assertPerf("isValidEmail", () => isValidEmail("contact@zishi.dev"));
  });

  it("escapeHtml reste rapide", () => {
    const input = '<div onclick="evil()">Test & "quote"</div>';
    assertPerf("escapeHtml", () => escapeHtml(input));
  });

  it("createSubmissionFingerprint reste rapide", () => {
    const payload = { name: "Alice", email: "a@test.com", message: "Hello" };
    assertPerf("createSubmissionFingerprint", () =>
      createSubmissionFingerprint("1.2.3.4", "contact", payload)
    );
  });

  it("parseJsonBody reste rapide", async () => {
    const body = JSON.stringify({
      name: "Test",
      email: "t@test.com",
      message: "Message de test assez long.",
    });
    const start = performance.now();
    for (let i = 0; i < 500; i += 1) {
      const request = new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      const result = await parseJsonBody(request);
      assert.equal(result.ok, true);
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 300, `parseJsonBody: ${elapsed.toFixed(1)}ms pour 500 parses`);
  });

  it("paginateReviews reste rapide sur un grand jeu", () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ id: i }));
    assertPerf("paginateReviews", () => paginateReviews(items, 3), 200);
  });
});
