import { escapeHtml } from "@/lib/email/escape-html";

type EmailLayoutOptions = {
  title: string;
  bodyHtml: string;
  footerNote?: string;
};

/** Mise en page HTML minimaliste et compatible clients mail. */
export function wrapEmailLayout({ title, bodyHtml, footerNote }: EmailLayoutOptions): string {
  const footer = footerNote
    ? `<p style="margin:24px 0 0;font-size:12px;color:#888;">${escapeHtml(footerNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px;">
          <tr>
            <td style="font-size:15px;line-height:1.6;color:#171717;">
              ${bodyHtml}
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailField(label: string, value: string): string {
  return `<p style="margin:0 0 12px;"><strong>${escapeHtml(label)}</strong><br>${value}</p>`;
}
