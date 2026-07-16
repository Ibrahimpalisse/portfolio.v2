import { handleFormPost } from "@/lib/api/handle-form-post";
import { jsonResponse } from "@/lib/api/json-response";
import { saveContactMessage } from "@/lib/contact/messages";
import { parseContactPayload, type ContactPayload } from "@/lib/contact-schema";
import { sendContactEmail } from "@/lib/email/send-contact-email";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";

export async function POST(request: Request) {
  return handleFormPost(request, {
    formKind: "contact",
    parsePayload: parseContactPayload,
    sendEmail: sendContactEmail,
    getRateLimitEmail: (data) => data.email,
    afterValidated: async ({ data, ip, fingerprint, request: req }) => {
      if (!isSupabaseServiceConfigured()) return false;

      const payload = data as ContactPayload;
      const result = await saveContactMessage({
        name: payload.name,
        email: payload.email,
        message: payload.message,
        fingerprint,
        ip,
        userAgent: req.headers.get("user-agent"),
      });

      return result.ok;
    },
  });
}

export function GET() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
