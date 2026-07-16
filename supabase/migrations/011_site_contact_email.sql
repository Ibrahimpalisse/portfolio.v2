-- Email public de contact (affichage site) — colonne sur site_social_links
-- Appliquer via : npm run db:migrate

ALTER TABLE public.site_social_links
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT 'contact@zishi.dev';

ALTER TABLE public.site_social_links
  DROP CONSTRAINT IF EXISTS site_social_contact_email_len;

ALTER TABLE public.site_social_links
  ADD CONSTRAINT site_social_contact_email_len
  CHECK (char_length(contact_email) <= 254);

COMMENT ON COLUMN public.site_social_links.contact_email IS
  'Email affiché sur le site (footer, contact, mentions). Pas la destination Resend.';

NOTIFY pgrst, 'reload schema';
