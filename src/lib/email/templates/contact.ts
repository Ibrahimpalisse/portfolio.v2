import type { ContactPayload } from "@/lib/contact-schema";
import { escapeHtml, escapeHtmlWithBreaks } from "@/lib/email/escape-html";
import { emailField, wrapEmailLayout } from "@/lib/email/templates/layout";

export type ContactEmailContent = {
  subject: string;
  html: string;
  text: string;
  replyTo: string;
};

export function buildContactEmail(data: ContactPayload): ContactEmailContent {
  const { name, email, message } = data;

  const bodyHtml = [
    "<h1>Nouvelle demande de contact</h1>",
    emailField("Nom", escapeHtml(name)),
    emailField(
      "Email",
      `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
    ),
    emailField("Message", escapeHtmlWithBreaks(message)),
  ].join("");

  const html = wrapEmailLayout({
    title: "Nouvelle demande de contact",
    bodyHtml,
    footerNote: "Reçu via le formulaire de contact du portfolio.",
  });

  const text = [
    "Nouvelle demande de contact",
    "",
    `Nom : ${name}`,
    `Email : ${email}`,
    "",
    "Message :",
    message,
    "",
    "— Formulaire contact portfolio",
  ].join("\n");

  return {
    subject: `Demande de projet — ${name}`,
    html,
    text,
    replyTo: email,
  };
}
