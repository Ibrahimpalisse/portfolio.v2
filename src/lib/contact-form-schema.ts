import { z } from "zod";
import { CONTACT_LIMITS } from "@/lib/contact-schema";
import { ValidationErrors, type ValidationErrorKey } from "@/lib/validation-errors";

type ValidationTranslate = (key: ValidationErrorKey) => string;

export function createContactFormSchema(t: ValidationTranslate) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(CONTACT_LIMITS.nameMin, t(ValidationErrors.nameTooShortMin))
      .max(CONTACT_LIMITS.nameMax, t(ValidationErrors.nameTooLong)),
    email: z
      .string()
      .trim()
      .min(1, t(ValidationErrors.emailRequired))
      .email(t(ValidationErrors.emailInvalid))
      .max(CONTACT_LIMITS.emailMax, t(ValidationErrors.emailTooLong)),
    message: z
      .string()
      .trim()
      .min(CONTACT_LIMITS.messageMin, t(ValidationErrors.messageTooShortMin))
      .max(CONTACT_LIMITS.messageMax, t(ValidationErrors.messageTooLong)),
    _honeypot: z.string().optional(),
  });
}

export type ContactFormValues = z.infer<ReturnType<typeof createContactFormSchema>>;

export const contactFormDefaultValues: ContactFormValues = {
  name: "",
  email: "",
  message: "",
  _honeypot: "",
};
