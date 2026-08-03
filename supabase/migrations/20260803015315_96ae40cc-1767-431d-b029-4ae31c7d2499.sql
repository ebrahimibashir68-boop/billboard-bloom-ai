-- 1. OpenOOH venue taxonomy (public reference data)
CREATE TABLE public.openooh_venue_types (
  id integer PRIMARY KEY,
  parent_id integer REFERENCES public.openooh_venue_types(id) ON DELETE SET NULL,
  level text NOT NULL CHECK (level IN ('category','child','grandchild')),
  name text NOT NULL,
  full_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.openooh_venue_types TO anon;
GRANT SELECT ON public.openooh_venue_types TO authenticated;
GRANT ALL ON public.openooh_venue_types TO service_role;
ALTER TABLE public.openooh_venue_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "openooh_public_read" ON public.openooh_venue_types FOR SELECT USING (true);

-- 2. Audience measurement per venue / daypart (public reference data)
CREATE TABLE public.venue_audience_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.billboard_locations(id) ON DELETE CASCADE,
  daypart text NOT NULL CHECK (daypart IN ('early_morning','morning','midday','afternoon','evening','late_night','event')),
  hour_start smallint NOT NULL CHECK (hour_start BETWEEN 0 AND 23),
  hour_end smallint NOT NULL CHECK (hour_end BETWEEN 0 AND 24),
  avg_audience integer NOT NULL DEFAULT 0,
  impression_multiplier numeric NOT NULL DEFAULT 1.0,
  avg_dwell_seconds integer NOT NULL DEFAULT 10,
  viewability_pct numeric NOT NULL DEFAULT 60,
  measurement_source text NOT NULL DEFAULT 'operator_estimate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_audience_target CHECK (venue_id IS NOT NULL OR location_id IS NOT NULL)
);
GRANT SELECT ON public.venue_audience_metrics TO anon;
GRANT SELECT ON public.venue_audience_metrics TO authenticated;
GRANT ALL ON public.venue_audience_metrics TO service_role;
ALTER TABLE public.venue_audience_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audience_public_read" ON public.venue_audience_metrics FOR SELECT USING (true);
CREATE TRIGGER trg_audience_updated_at BEFORE UPDATE ON public.venue_audience_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Delivery reporting: booked vs delivered (server-only)
CREATE TABLE public.delivery_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  placement_id uuid REFERENCES public.ad_placements(id) ON DELETE CASCADE,
  insertion_order_id uuid REFERENCES public.insertion_orders(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.ad_contracts(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.ad_partners(id) ON DELETE SET NULL,
  advertiser_pi_uid text,
  report_date date NOT NULL DEFAULT (now()::date),
  booked_impressions bigint NOT NULL DEFAULT 0,
  delivered_impressions bigint NOT NULL DEFAULT 0,
  plays integer NOT NULL DEFAULT 0,
  cpm_pi numeric NOT NULL DEFAULT 0,
  spend_pi numeric NOT NULL DEFAULT 0,
  discrepancy_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.delivery_reports TO service_role;
ALTER TABLE public.delivery_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_reports_deny_all" ON public.delivery_reports AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_delivery_reports_updated_at BEFORE UPDATE ON public.delivery_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Credit notes against invoices (server-only)
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL UNIQUE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.ad_partners(id) ON DELETE SET NULL,
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  amount_pi numeric NOT NULL CHECK (amount_pi > 0),
  reason text NOT NULL DEFAULT 'under_delivery',
  notes text,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','applied','void')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_notes_deny_all" ON public.credit_notes AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Pi App-to-User payouts (server-only)
CREATE TABLE public.pi_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_number text NOT NULL UNIQUE,
  partner_id uuid REFERENCES public.ad_partners(id) ON DELETE SET NULL,
  screen_id uuid REFERENCES public.screens(id) ON DELETE SET NULL,
  recipient_pi_uid text NOT NULL,
  recipient_pi_username text,
  recipient_wallet_address text,
  kind text NOT NULL DEFAULT 'revenue_share' CHECK (kind IN ('revenue_share','make_good','refund','bonus')),
  amount_pi numeric NOT NULL CHECK (amount_pi > 0),
  revenue_share_pct numeric NOT NULL DEFAULT 0,
  gross_pi numeric NOT NULL DEFAULT 0,
  memo text NOT NULL DEFAULT 'Pi Billboard revenue share',
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  period_start date,
  period_end date,
  pi_payment_id text,
  pi_txid text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','submitted','completed','failed','cancelled')),
  failure_reason text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pi_payouts TO service_role;
ALTER TABLE public.pi_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pi_payouts_deny_all" ON public.pi_payouts AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_pi_payouts_updated_at BEFORE UPDATE ON public.pi_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_pi_payouts_recipient ON public.pi_payouts(recipient_pi_uid, status);

-- 6. Additive columns on existing tables
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS openooh_venue_type_id integer REFERENCES public.openooh_venue_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cpm_pi numeric,
  ADD COLUMN IF NOT EXISTS avg_dwell_seconds integer;

ALTER TABLE public.billboard_locations
  ADD COLUMN IF NOT EXISTS openooh_venue_type_id integer REFERENCES public.openooh_venue_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cpm_pi numeric,
  ADD COLUMN IF NOT EXISTS avg_dwell_seconds integer,
  ADD COLUMN IF NOT EXISTS viewability_pct numeric;

ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS openooh_venue_type_id integer REFERENCES public.openooh_venue_types(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS cpm_pi numeric,
  ADD COLUMN IF NOT EXISTS booked_impressions bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_impressions bigint NOT NULL DEFAULT 0;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PI',
  ADD COLUMN IF NOT EXISTS payment_terms text NOT NULL DEFAULT 'net_7',
  ADD COLUMN IF NOT EXISTS agency_commission_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credited_total_pi numeric NOT NULL DEFAULT 0;

ALTER TABLE public.insertion_orders
  ADD COLUMN IF NOT EXISTS net_terms_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.proof_of_plays
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ledger_hash text;

ALTER TABLE public.ad_partners
  ADD COLUMN IF NOT EXISTS payment_terms text NOT NULL DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS payout_wallet_address text,
  ADD COLUMN IF NOT EXISTS min_payout_pi numeric NOT NULL DEFAULT 1;