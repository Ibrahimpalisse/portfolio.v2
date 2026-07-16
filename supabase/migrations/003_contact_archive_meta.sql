-- Métadonnées d'archivage (note interne + lien conversation email)
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS archive_note text
    CHECK (archive_note IS NULL OR char_length(archive_note) BETWEEN 1 AND 2000),
  ADD COLUMN IF NOT EXISTS conversation_url text
    CHECK (conversation_url IS NULL OR char_length(conversation_url) BETWEEN 8 AND 2048);

COMMENT ON COLUMN public.contact_messages.archive_note IS
  'Note interne saisie à l''archivage (suivi projet / décision).';

COMMENT ON COLUMN public.contact_messages.conversation_url IS
  'Lien http(s) vers le fil email (Gmail, Outlook, etc.).';
