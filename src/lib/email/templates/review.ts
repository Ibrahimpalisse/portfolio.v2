import type { ReviewPayload } from "@/lib/review-schema";
import { escapeHtml, escapeHtmlWithBreaks } from "@/lib/email/escape-html";
import { emailField, wrapEmailLayout } from "@/lib/email/templates/layout";

export type ReviewEmailContent = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

function formatStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function buildReviewEmail(data: ReviewPayload): ReviewEmailContent {
  const { name, email, role, rating, message } = data;
  const stars = formatStars(rating);

  const fields = [
    emailField("Nom", escapeHtml(name)),
    emailField("Note", `${escapeHtml(stars)} (${rating}/5)`),
  ];

  if (email) {
    fields.push(
      emailField(
        "Email",
        `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
      )
    );
  }

  if (role) {
    fields.push(emailField("Rôle / entreprise", escapeHtml(role)));
  }

  fields.push(emailField("Message", escapeHtmlWithBreaks(message)));

  const bodyHtml = ["<h1>Nouvel avis client</h1>", ...fields].join("");

  const html = wrapEmailLayout({
    title: "Nouvel avis client",
    bodyHtml,
    footerNote: "Reçu via le formulaire d'avis du portfolio.",
  });

  const textLines = [
    "Nouvel avis client",
    "",
    `Nom : ${name}`,
    `Note : ${stars} (${rating}/5)`,
  ];

  if (email) textLines.push(`Email : ${email}`);
  if (role) textLines.push(`Rôle : ${role}`);

  textLines.push("", "Message :", message, "", "— Formulaire avis portfolio");

  return {
    subject: `Nouvel avis client — ${name} (${rating}/5)`,
    html,
    text: textLines.join("\n"),
    replyTo: email,
  };
}
