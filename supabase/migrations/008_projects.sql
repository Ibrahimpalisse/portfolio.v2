-- Projets portfolio (CRUD admin + affichage site)
-- Appliquer via : npm run db:migrate
--
-- Accès table : RLS on, seul service_role
-- Images : bucket Storage public `portfolio-projects`

CREATE TABLE IF NOT EXISTS public.projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  slug            text NOT NULL
                  CHECK (char_length(slug) BETWEEN 2 AND 80),
  title           jsonb NOT NULL DEFAULT '{}'::jsonb,
  description     jsonb NOT NULL DEFAULT '{}'::jsonb,
  kind            text NOT NULL DEFAULT 'personal'
                  CHECK (kind IN ('personal', 'sold')),
  tech_ids        text[] NOT NULL DEFAULT '{}',
  images          jsonb NOT NULL DEFAULT '[]'::jsonb,
  link            text
                  CHECK (link IS NULL OR char_length(link) BETWEEN 8 AND 500),
  sort_order      integer NOT NULL DEFAULT 0,
  published       boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_uidx ON public.projects (slug);
CREATE INDEX IF NOT EXISTS projects_published_sort_idx
  ON public.projects (published, sort_order ASC, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_projects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_set_updated_at ON public.projects;
CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_projects_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.projects FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO service_role;

COMMENT ON TABLE public.projects IS
  'Projets portfolio. Contenu i18n JSONB. Images = URLs Storage. Admin MFA + service_role.';

-- Bucket Storage public (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-projects',
  'portfolio-projects',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique des objets du bucket
DROP POLICY IF EXISTS "portfolio_projects_public_read" ON storage.objects;
CREATE POLICY "portfolio_projects_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'portfolio-projects');

-- Écriture / màj / suppression : service_role only (pas de policy pour anon/authenticated)
-- service_role bypass RLS Storage

NOTIFY pgrst, 'reload schema';
