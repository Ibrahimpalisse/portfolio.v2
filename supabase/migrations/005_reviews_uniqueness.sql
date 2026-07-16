-- Unicité avis actifs + indexes rate-limit IP
-- Nettoie d'abord les doublons email (garde le plus récent)
-- Un email = au plus un avis pending|published (rejeté → peut resoumettre)

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY lower(email)
      ORDER BY created_at DESC
    ) AS rn
  FROM public.reviews
  WHERE status IN ('pending', 'published')
)
UPDATE public.reviews AS r
SET status = 'rejected',
    published_at = NULL,
    updated_at = now()
FROM ranked
WHERE r.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_active_email_uidx
  ON public.reviews (lower(email))
  WHERE status IN ('pending', 'published');

CREATE INDEX IF NOT EXISTS reviews_ip_hash_created_at_idx
  ON public.reviews (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

COMMENT ON INDEX public.reviews_active_email_uidx IS
  'Empêche plusieurs avis actifs (pending/published) pour le même email.';
