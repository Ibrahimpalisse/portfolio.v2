import { z } from "zod";

export const adminMfaVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Entrez le code à 6 chiffres de votre application."),
  factorId: z.string().min(1, "Session MFA invalide."),
  challengeId: z.string().min(1, "Session MFA expirée."),
});

export type AdminMfaVerifyValues = z.infer<typeof adminMfaVerifySchema>;

export function parseAdminMfaVerifyBody(body: unknown):
  | { ok: true; data: AdminMfaVerifyValues }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Requête invalide." };
  }

  const parsed = adminMfaVerifySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return { ok: false, error: first ?? "Requête invalide." };
  }

  return { ok: true, data: parsed.data };
}
