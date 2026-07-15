import { z } from "zod";
import { ADMIN_LOGIN_LIMITS } from "@/lib/admin/constants";

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email requis.")
    .max(ADMIN_LOGIN_LIMITS.maxEmailLength, "Email trop long.")
    .email("Email invalide."),
  password: z
    .string()
    .min(ADMIN_LOGIN_LIMITS.minPasswordLength, "Mot de passe trop court.")
    .max(ADMIN_LOGIN_LIMITS.maxPasswordLength, "Mot de passe trop long."),
  _honeypot: z.string().optional(),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export const adminLoginDefaultValues: AdminLoginValues = {
  email: "",
  password: "",
  _honeypot: "",
};

export type AdminLoginPayload = Pick<AdminLoginValues, "email" | "password">;

export function parseAdminLoginBody(body: unknown):
  | { ok: true; data: AdminLoginPayload }
  | { ok: false; error: "honeypot" | "invalid" | string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid" };
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return { ok: false, error: first ?? "Requête invalide." };
  }

  if (parsed.data._honeypot?.trim()) {
    return { ok: false, error: "honeypot" };
  }

  return {
    ok: true,
    data: {
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
    },
  };
}
