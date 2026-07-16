import { z } from "zod";
import { REVIEW_LIMITS } from "@/lib/review-schema";
import { ValidationErrors, type ValidationErrorKey } from "@/lib/validation-errors";

type ValidationTranslate = (key: ValidationErrorKey) => string;

export function createReviewFormSchema(t: ValidationTranslate) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(REVIEW_LIMITS.nameMin, t(ValidationErrors.nameTooShortMin))
      .max(REVIEW_LIMITS.nameMax, t(ValidationErrors.nameTooLong)),
    email: z
      .string()
      .trim()
      .min(1, t(ValidationErrors.emailRequired))
      .max(REVIEW_LIMITS.emailMax, t(ValidationErrors.emailTooLong))
      .email(t(ValidationErrors.emailInvalid)),
    role: z
      .string()
      .trim()
      .max(REVIEW_LIMITS.roleMax, t(ValidationErrors.roleTooLong)),
    rating: z
      .number({ message: t(ValidationErrors.ratingRequired) })
      .int()
      .min(1, t(ValidationErrors.ratingRequired))
      .max(5, t(ValidationErrors.ratingInvalid)),
    message: z
      .string()
      .trim()
      .min(REVIEW_LIMITS.messageMin, t(ValidationErrors.messageTooShortMin))
      .max(REVIEW_LIMITS.messageMax, t(ValidationErrors.messageTooLong)),
    _honeypot: z.string().optional(),
  });
}

export type ReviewFormValues = z.infer<ReturnType<typeof createReviewFormSchema>>;

export const reviewFormDefaultValues: ReviewFormValues = {
  name: "",
  email: "",
  role: "",
  rating: 0,
  message: "",
  _honeypot: "",
};
