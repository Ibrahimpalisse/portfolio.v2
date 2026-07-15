import {
  isHoneypotTriggered,
  isValidEmail,
  normalizeEmail,
  sanitizePersonName,
  sanitizeText,
} from "@/lib/form-validation";
import { ValidationErrors } from "@/lib/validation-errors";

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  messageMin: 10,
  messageMax: 5000,
} as const;

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

export type ContactValidationResult =
  | { ok: true; data: ContactPayload }
  | { ok: false; error: string; field?: keyof ContactPayload | "_honeypot" };

export type ContactFormInput = {
  name: string;
  email: string;
  message: string;
  _honeypot?: string;
};

export function parseContactPayload(body: unknown): ContactValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: ValidationErrors.invalidRequest };
  }

  const raw = body as Record<string, unknown>;

  if (isHoneypotTriggered(typeof raw._honeypot === "string" ? raw._honeypot : "")) {
    return { ok: false, error: "honeypot" };
  }

  const name = sanitizePersonName(
    typeof raw.name === "string" ? raw.name : "",
    CONTACT_LIMITS.nameMax
  );
  const email = normalizeEmail(
    sanitizeText(typeof raw.email === "string" ? raw.email : "", CONTACT_LIMITS.emailMax)
  );
  const message = sanitizeText(
    typeof raw.message === "string" ? raw.message : "",
    CONTACT_LIMITS.messageMax
  );

  if (name.length < CONTACT_LIMITS.nameMin) {
    return { ok: false, error: ValidationErrors.nameTooShort, field: "name" };
  }

  if (!email || !isValidEmail(email)) {
    return { ok: false, error: ValidationErrors.emailInvalid, field: "email" };
  }

  if (message.length < CONTACT_LIMITS.messageMin) {
    return { ok: false, error: ValidationErrors.messageTooShortMin, field: "message" };
  }

  return { ok: true, data: { name, email, message } };
}

export function validateContactForm(input: ContactFormInput): ContactValidationResult {
  return parseContactPayload(input);
}
