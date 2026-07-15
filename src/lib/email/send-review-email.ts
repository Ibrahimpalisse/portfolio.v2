import type { ReviewPayload } from "@/lib/review-schema";
import type { FormSubmitContext } from "@/lib/api/form-types";
import { sendTransactionalEmail } from "@/lib/email/send-transactional";
import { buildReviewEmail } from "@/lib/email/templates/review";
import type { SendEmailResult } from "@/lib/email/types";

export async function sendReviewEmail(
  data: ReviewPayload,
  context: FormSubmitContext
): Promise<SendEmailResult> {
  const content = buildReviewEmail(data);

  return sendTransactionalEmail({
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: content.replyTo,
    idempotencyKey: context.idempotencyKey,
    tags: [{ name: "category", value: "review" }],
  });
}
