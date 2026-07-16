import { z } from "zod";
import { ADMIN_PASSWORD_CHANGE_LIMITS } from "@/lib/admin/constants";

const { minLength, maxLength } = ADMIN_PASSWORD_CHANGE_LIMITS;

/**
 * Politique OWASP-aligned pour comptes privilégiés :
 * longueur, complexité, confirmation, honeypot.
 */
export const adminPasswordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Mot de passe actuel requis.")
      .max(maxLength, "Mot de passe trop long."),
    newPassword: z
      .string()
      .min(minLength, `Le nouveau mot de passe doit contenir au moins ${minLength} caractères.`)
      .max(maxLength, "Mot de passe trop long.")
      .regex(/[a-z]/, "Ajoutez au moins une lettre minuscule.")
      .regex(/[A-Z]/, "Ajoutez au moins une lettre majuscule.")
      .regex(/[0-9]/, "Ajoutez au moins un chiffre.")
      .regex(/[^A-Za-z0-9]/, "Ajoutez au moins un caractère spécial."),
    confirmPassword: z.string().min(1, "Confirmez le nouveau mot de passe."),
    _honeypot: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas.",
      });
    }
    if (
      values.currentPassword &&
      values.newPassword &&
      values.currentPassword === values.newPassword
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Le nouveau mot de passe doit être différent de l'actuel.",
      });
    }
  });

export type AdminPasswordChangeValues = z.infer<typeof adminPasswordChangeSchema>;

export const adminPasswordChangeDefaultValues: AdminPasswordChangeValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  _honeypot: "",
};

export type AdminPasswordChangePayload = {
  currentPassword: string;
  newPassword: string;
};

export function parseAdminPasswordChangeBody(body: unknown):
  | { ok: true; data: AdminPasswordChangePayload }
  | { ok: false; error: "honeypot" | "invalid" | string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid" };
  }

  const parsed = adminPasswordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Requête invalide.",
    };
  }

  if (parsed.data._honeypot?.trim()) {
    return { ok: false, error: "honeypot" };
  }

  return {
    ok: true,
    data: {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    },
  };
}
