
CREATE TABLE public.ad_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('individual','enterprise')),
  title text NOT NULL,
  body_text text NOT NULL,
  image_url text,
  placements text[] NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days > 0 AND duration_days <= 365),
  target_venues integer NOT NULL CHECK (target_venues > 0 AND target_venues <= 50),
  cost_pi numeric NOT NULL CHECK (cost_pi > 0),
  contract_hash text NOT NULL UNIQUE,
  contract_json jsonb NOT NULL,
  pi_payment_id text,
  pi_txid text,
  status text NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment','active','completed','cancelled')),
  activated_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ad_contracts TO service_role;
ALTER TABLE public.ad_contracts ENABLE ROW LEVEL SECURITY;
CREATE INDEX ad_contracts_pi_uid_idx ON public.ad_contracts (advertiser_pi_uid, created_at DESC);
CREATE INDEX ad_contracts_status_idx ON public.ad_contracts (status, created_at DESC);
CREATE TRIGGER ad_contracts_set_updated_at BEFORE UPDATE ON public.ad_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.ad_contracts(id) ON DELETE CASCADE,
  venue_code text NOT NULL,
  venue_name text NOT NULL,
  sport text NOT NULL,
  ai_match_score numeric NOT NULL,
  ai_reasoning text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','playing','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ad_placements TO service_role;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
CREATE INDEX ad_placements_contract_idx ON public.ad_placements (contract_id);

CREATE TABLE public.ad_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.ad_placements(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  impressions integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.ad_plays TO service_role;
ALTER TABLE public.ad_plays ENABLE ROW LEVEL SECURITY;
CREATE INDEX ad_plays_placement_idx ON public.ad_plays (placement_id, played_at DESC);
