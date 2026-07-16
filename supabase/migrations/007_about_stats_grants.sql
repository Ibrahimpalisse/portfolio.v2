-- Droits service_role sur about_stats (oubliés dans 006)
-- Appliquer via : npm run db:migrate

REVOKE ALL ON public.about_stats FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.about_stats TO service_role;

NOTIFY pgrst, 'reload schema';
