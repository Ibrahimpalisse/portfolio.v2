-- Index pour le rate limit journalier (COUNT sur fenêtre 24 h)
CREATE INDEX IF NOT EXISTS contact_messages_email_created_at_idx
  ON public.contact_messages (email, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_messages_ip_hash_created_at_idx
  ON public.contact_messages (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;
