import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidationErrorKey,
  translateValidationError,
  ValidationErrors,
} from "@/lib/validation-errors";

describe("validation-errors", () => {
  it("isValidationErrorKey reconnaît les clés connues", () => {
    assert.equal(isValidationErrorKey(ValidationErrors.rateLimited), true);
    assert.equal(
      isValidationErrorKey(ValidationErrors.reviewAlreadySubmitted),
      true
    );
    assert.equal(
      isValidationErrorKey(ValidationErrors.reviewIpRateLimited),
      true
    );
    assert.equal(isValidationErrorKey("unknownKey"), false);
    assert.equal(isValidationErrorKey(""), false);
  });

  it("translateValidationError traduit ou retombe sur fallback", () => {
    const t = (key: string) => `translated:${key}`;
    assert.equal(
      translateValidationError(ValidationErrors.unauthorized, t),
      "translated:unauthorized"
    );
    assert.equal(
      translateValidationError("injection<script>", t),
      "translated:checkFields"
    );
    assert.equal(
      translateValidationError(undefined, t, ValidationErrors.networkError),
      "translated:networkError"
    );
  });
});
