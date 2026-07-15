import { handleFormPost } from "@/lib/api/handle-form-post";
import { jsonResponse } from "@/lib/api/json-response";
import { parseContactPayload } from "@/lib/contact-schema";
import { sendContactEmail } from "@/lib/email/send-contact-email";

export async function POST(request: Request) {
  return handleFormPost(request, {
    formKind: "contact",
    parsePayload: parseContactPayload,
    sendEmail: sendContactEmail,
    getRateLimitEmail: (data) => data.email,
  });
}

export function GET() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
