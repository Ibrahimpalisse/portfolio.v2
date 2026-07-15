import type { ContactPayload } from "@/lib/contact-schema";
import type { FormSubmitContext } from "@/lib/api/form-types";
import { sendTransactionalEmail } from "@/lib/email/send-transactional";
import { buildContactEmail } from "@/lib/email/templates/contact";
import type { SendEmailResult } from "@/lib/email/types";

export async function sendContactEmail(
  data: ContactPayload,
  context: FormSubmitContext
): Promise<SendEmailResult> {
  const content = buildContactEmail(data);

  return sendTransactionalEmail({
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: content.replyTo,
    idempotencyKey: context.idempotencyKey,
    tags: [{ name: "category", value: "contact" }],
  });
}
