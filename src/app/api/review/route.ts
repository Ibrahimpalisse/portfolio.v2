import { handleFormPost } from "@/lib/api/handle-form-post";
import { jsonResponse } from "@/lib/api/json-response";
import { saveReview } from "@/lib/reviews/store";
import { parseReviewPayload, type ReviewPayload } from "@/lib/review-schema";
import { sendReviewEmail } from "@/lib/email/send-review-email";
import { isSupabaseServiceConfigured } from "@/lib/supabase/service";
import { ValidationErrors } from "@/lib/validation-errors";

export async function POST(request: Request) {
  return handleFormPost(request, {
    formKind: "review",
    parsePayload: parseReviewPayload,
    sendEmail: sendReviewEmail,
    getRateLimitEmail: (data) => data.email,
    afterValidated: async ({ data, ip, fingerprint, request: req }) => {
      if (!isSupabaseServiceConfigured()) return false;

      const payload = data as ReviewPayload;
      if (!payload.email) return false;

      const result = await saveReview({
        name: payload.name,
        email: payload.email,
        role: payload.role,
        message: payload.message,
        rating: payload.rating,
        fingerprint,
        ip,
        userAgent: req.headers.get("user-agent"),
      });

      if (!result.ok) {
        if (result.reason === "duplicate_email") {
          return { ok: false, error: ValidationErrors.reviewAlreadySubmitted };
        }
        return false;
      }

      return true;
    },
  });
}

export function GET() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
