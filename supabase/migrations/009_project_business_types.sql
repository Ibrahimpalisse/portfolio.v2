-- Remplace tech_ids (stack technique) par business_type_ids (type métier).
-- Appliquer via : npm run db:migrate

ALTER TABLE public.projects
  RENAME COLUMN tech_ids TO business_type_ids;

-- Anciennes techs (nextjs, react…) ne correspondent plus → on repart propre.
UPDATE public.projects
SET business_type_ids = '{}';
