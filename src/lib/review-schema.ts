import {
  isHoneypotTriggered,
  isValidEmail,
  normalizeEmail,
  sanitizePersonName,
  sanitizeText,
} from "@/lib/form-validation";
import { ValidationErrors } from "@/lib/validation-errors";

export const REVIEW_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  roleMax: 120,
  messageMin: 10,
  messageMax: 2000,
} as const;

export type ReviewPayload = {
  name: string;
  email?: string;
  role?: string;
  rating: number;
  message: string;
};

export type ReviewValidationResult =
  | { ok: true; data: ReviewPayload }
  | { ok: false; error: string; field?: string };

function trimOptionalEmail(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = normalizeEmail(sanitizeText(value, max));
  return trimmed || undefined;
}

function trimOptionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = sanitizeText(value, max);
  return trimmed || undefined;
}

export function parseReviewPayload(body: unknown): ReviewValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: ValidationErrors.invalidRequest };
  }

  const raw = body as Record<string, unknown>;

  if (isHoneypotTriggered(typeof raw._honeypot === "string" ? raw._honeypot : "")) {
    return { ok: false, error: "honeypot" };
  }

  const name = sanitizePersonName(
    typeof raw.name === "string" ? raw.name : "",
    REVIEW_LIMITS.nameMax
  );
  const message = sanitizeText(
    typeof raw.message === "string" ? raw.message : "",
    REVIEW_LIMITS.messageMax
  );
  const email = trimOptionalEmail(raw.email, REVIEW_LIMITS.emailMax);
  const roleRaw = trimOptionalText(raw.role, REVIEW_LIMITS.roleMax);
  const role = roleRaw
    ? sanitizePersonName(roleRaw, REVIEW_LIMITS.roleMax) || undefined
    : undefined;

  const ratingNum = Number(raw.rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return { ok: false, error: ValidationErrors.ratingInvalidRange, field: "rating" };
  }

  if (name.length < REVIEW_LIMITS.nameMin) {
    return { ok: false, error: ValidationErrors.nameTooShort, field: "name" };
  }

  if (message.length < REVIEW_LIMITS.messageMin) {
    return { ok: false, error: ValidationErrors.messageTooShortMin, field: "message" };
  }

  if (email && !isValidEmail(email)) {
    return { ok: false, error: ValidationErrors.emailInvalid, field: "email" };
  }

  return {
    ok: true,
    data: { name, email, role, rating: ratingNum, message },
  };
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
