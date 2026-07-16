-- OWASP A01 / A03 — messages contact
-- Appliquer via : npm run db:migrate
-- (requiert DATABASE_URL dans .env.local)
--
-- Principe :
-- - RLS activé
-- - Aucune policy pour anon / authenticated → lecture/écriture client bloquées
-- - Seul le service_role (API Next.js après contrôles auth) écrit et lit

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  name          text NOT NULL
                CHECK (char_length(name) BETWEEN 2 AND 100),
  email         text NOT NULL
                CHECK (char_length(email) BETWEEN 3 AND 254),
  message       text NOT NULL
                CHECK (char_length(message) BETWEEN 10 AND 5000),
  status        text NOT NULL DEFAULT 'unread'
                CHECK (status IN ('unread', 'read', 'archived')),
  fingerprint   text,
  ip_hash       text,
  user_agent_hash text
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON public.contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS contact_messages_status_idx
  ON public.contact_messages (status);

CREATE UNIQUE INDEX IF NOT EXISTS contact_messages_fingerprint_uidx
  ON public.contact_messages (fingerprint)
  WHERE fingerprint IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_contact_messages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contact_messages_set_updated_at ON public.contact_messages;
CREATE TRIGGER contact_messages_set_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_messages_updated_at();

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO service_role;

COMMENT ON TABLE public.contact_messages IS
  'Inbox contact portfolio. Accès uniquement via API admin (service_role + MFA).';
