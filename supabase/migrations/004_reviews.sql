-- OWASP A01 / A03 — avis clients (modération admin)
-- Appliquer via : npm run db:migrate
--
-- Statuts :
--   pending   = soumis, en attente de validation
--   published = validé, visible sur le site
--   rejected  = refusé (conservé pour audit, non public)
--
-- Accès : RLS on, seul service_role (API Next.js + MFA admin)

CREATE TABLE IF NOT EXISTS public.reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz,
  name            text NOT NULL
                  CHECK (char_length(name) BETWEEN 2 AND 100),
  email           text NOT NULL
                  CHECK (char_length(email) BETWEEN 3 AND 254),
  role            text
                  CHECK (role IS NULL OR char_length(role) BETWEEN 1 AND 120),
  message         text NOT NULL
                  CHECK (char_length(message) BETWEEN 10 AND 2000),
  rating          smallint NOT NULL
                  CHECK (rating BETWEEN 1 AND 5),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'published', 'rejected')),
  fingerprint     text,
  ip_hash         text,
  user_agent_hash text
);

CREATE INDEX IF NOT EXISTS reviews_created_at_idx
  ON public.reviews (created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_status_idx
  ON public.reviews (status);

CREATE INDEX IF NOT EXISTS reviews_published_at_idx
  ON public.reviews (published_at DESC NULLS LAST)
  WHERE status = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS reviews_fingerprint_uidx
  ON public.reviews (fingerprint)
  WHERE fingerprint IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_reviews_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_set_updated_at ON public.reviews;
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reviews_updated_at();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO service_role;

COMMENT ON TABLE public.reviews IS
  'Avis clients portfolio. Soumission publique → pending. Publication via admin MFA + service_role.';
