-- Chiffres section « À propos » (singleton éditable depuis l'admin)
-- Appliquer via : npm run db:migrate
--
-- Accès : RLS on, seul service_role (API Next.js + MFA admin)

CREATE TABLE IF NOT EXISTS public.about_stats (
  id              text PRIMARY KEY DEFAULT 'default'
                  CHECK (id = 'default'),
  years           numeric(5, 1) NOT NULL DEFAULT 2.5
                  CHECK (years >= 0 AND years <= 100),
  clients         integer NOT NULL DEFAULT 1
                  CHECK (clients >= 0 AND clients <= 100000),
  projects        integer NOT NULL DEFAULT 4
                  CHECK (projects >= 0 AND projects <= 100000),
  response_hours  integer NOT NULL DEFAULT 48
                  CHECK (response_hours >= 0 AND response_hours <= 720),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.about_stats (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.about_stats ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.about_stats IS
  'Singleton : métriques affichées dans la section À propos du portfolio.';
