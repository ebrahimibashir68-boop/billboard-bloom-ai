
ALTER TABLE public.ad_partners ADD COLUMN IF NOT EXISTS owner_pi_uid text;
ALTER TABLE public.ad_partners ADD COLUMN IF NOT EXISTS owner_pi_username text;
CREATE INDEX IF NOT EXISTS ad_partners_owner_pi_uid_idx ON public.ad_partners(owner_pi_uid);
