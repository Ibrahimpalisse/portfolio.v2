import { getEmailConfig } from "@/lib/email/config";
import { getResendClient } from "@/lib/email/resend-client";
import { sanitizeEmailSubject, sanitizeReplyTo } from "@/lib/email/sanitize-email-headers";
import type { SendEmailParams, SendEmailResult } from "@/lib/email/types";

/** Envoie un email transactionnel via Resend (serveur uniquement). */
export async function sendTransactionalEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const configResult = getEmailConfig();
  if (!configResult.ok) {
    console.error("[email] Configuration Resend incomplète:", configResult.reason);
    return { ok: false, reason: "not_configured" };
  }

  const resend = getResendClient();
  if (!resend) {
    return { ok: false, reason: "not_configured" };
  }

  const { config } = configResult;
  const replyTo = sanitizeReplyTo(params.replyTo);

  try {
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: [config.notifyTo],
      subject: sanitizeEmailSubject(params.subject),
      html: params.html,
      text: params.text,
      ...(replyTo ? { replyTo } : {}),
      ...(params.tags?.length ? { tags: params.tags } : {}),
      ...(params.idempotencyKey
        ? { idempotencyKey: params.idempotencyKey.slice(0, 256) }
        : {}),
    });

    if (error) {
      console.error("[email] Resend error:", error.name, error.message);
      return { ok: false, reason: "send_failed" };
    }

    if (!data?.id) {
      console.error("[email] Resend: réponse sans identifiant");
      return { ok: false, reason: "send_failed" };
    }

    return { ok: true, id: data.id };
  } catch (err) {
    console.error(
      "[email] Envoi échoué:",
      err instanceof Error ? err.message : err
    );
    return { ok: false, reason: "send_failed" };
  }
}
