import { escapeHtml } from "@/lib/email/escape-html";

type EmailLayoutOptions = {
  title: string;
  bodyHtml: string;
  footerNote?: string;
};

/** HTML brut, sans cadre ni styles. */
export function wrapEmailLayout({ title, bodyHtml, footerNote }: EmailLayoutOptions): string {
  const footer = footerNote ? `<p>${escapeHtml(footerNote)}</p>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
${bodyHtml}
${footer}
</body>
</html>`;
}

export function emailField(label: string, value: string): string {
  return `<p><strong>${escapeHtml(label)}</strong><br>${value}</p>`;
}
