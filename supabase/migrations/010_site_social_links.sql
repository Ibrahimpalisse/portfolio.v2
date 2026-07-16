-- Singleton liens réseaux (footer + JSON-LD)
-- Appliquer via : npm run db:migrate
--
-- Accès : RLS on, seul service_role (API Next.js + MFA admin)

CREATE TABLE IF NOT EXISTS public.site_social_links (
  id          text PRIMARY KEY DEFAULT 'default'
              CHECK (id = 'default'),
  discord     text NOT NULL DEFAULT '',
  whatsapp    text NOT NULL DEFAULT '',
  instagram   text NOT NULL DEFAULT '',
  tiktok      text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_social_discord_len CHECK (char_length(discord) <= 500),
  CONSTRAINT site_social_whatsapp_len CHECK (char_length(whatsapp) <= 500),
  CONSTRAINT site_social_instagram_len CHECK (char_length(instagram) <= 500),
  CONSTRAINT site_social_tiktok_len CHECK (char_length(tiktok) <= 500)
);

INSERT INTO public.site_social_links (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_social_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.site_social_links FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_social_links TO service_role;

COMMENT ON TABLE public.site_social_links IS
  'Singleton : URLs réseaux sociaux du footer (Discord, WhatsApp, Instagram, TikTok).';

NOTIFY pgrst, 'reload schema';
