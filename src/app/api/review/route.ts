import { handleFormPost } from "@/lib/api/handle-form-post";
import { jsonResponse } from "@/lib/api/json-response";
import { sendReviewEmail } from "@/lib/email/send-review-email";
import { parseReviewPayload } from "@/lib/review-schema";

export async function POST(request: Request) {
  return handleFormPost(request, {
    formKind: "review",
    parsePayload: parseReviewPayload,
    sendEmail: sendReviewEmail,
    getRateLimitEmail: (data) => data.email,
  });
}

export function GET() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
