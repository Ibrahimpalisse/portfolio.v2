export const ValidationErrors = {
  invalidRequest: "invalidRequest",
  nameTooShort: "nameTooShort",
  nameTooShortMin: "nameTooShortMin",
  nameTooLong: "nameTooLong",
  emailRequired: "emailRequired",
  emailInvalid: "emailInvalid",
  emailTooLong: "emailTooLong",
  messageTooShort: "messageTooShort",
  messageTooShortMin: "messageTooShortMin",
  messageTooLong: "messageTooLong",
  roleTooLong: "roleTooLong",
  ratingRequired: "ratingRequired",
  ratingInvalid: "ratingInvalid",
  ratingInvalidRange: "ratingInvalidRange",
  cooldown: "cooldown",
  mailTooLong: "mailTooLong",
  rateLimited: "rateLimited",
  checkFields: "checkFields",
  networkError: "networkError",
  turnstileFailed: "turnstileFailed",
  sendFailed: "sendFailed",
  serviceUnavailable: "serviceUnavailable",
  unauthorized: "unauthorized",
} as const;

export type ValidationErrorKey = (typeof ValidationErrors)[keyof typeof ValidationErrors];

const KNOWN_KEYS = new Set<string>(Object.values(ValidationErrors));

export function isValidationErrorKey(value: string): value is ValidationErrorKey {
  return KNOWN_KEYS.has(value);
}

export function translateValidationError(
  error: string | undefined,
  t: (key: ValidationErrorKey) => string,
  fallback: ValidationErrorKey = ValidationErrors.checkFields
): string {
  if (error && isValidationErrorKey(error)) {
    return t(error);
  }
  return t(fallback);
}
