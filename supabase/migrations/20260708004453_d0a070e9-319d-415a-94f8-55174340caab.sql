
-- Traditional OOH billboard workflow: RFPs, proposals, insertion orders,
-- rate cards, proof-of-play, invoices, make-goods, creative specs.

-- 1. Rate cards (per venue, per period) --------------------------------------
CREATE TABLE public.venue_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.ad_partners(id) ON DELETE CASCADE,
  label text NOT NULL,                          -- e.g. "Q1 Peak", "Standard"
  cpm_pi numeric NOT NULL,                      -- cost per 1000 impressions in Pi
  daily_rate_pi numeric,                        -- optional flat daily
  weekly_rate_pi numeric,
  monthly_rate_pi numeric,
  min_booking_days integer NOT NULL DEFAULT 7,
  season_multiplier numeric NOT NULL DEFAULT 1.0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.venue_rate_cards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_rate_cards TO authenticated;
GRANT ALL ON public.venue_rate_cards TO service_role;
ALTER TABLE public.venue_rate_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rate cards public read" ON public.venue_rate_cards FOR SELECT USING (active = true);
CREATE POLICY "Partners manage own rate cards" ON public.venue_rate_cards FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()));
CREATE POLICY "Admins manage all rate cards" ON public.venue_rate_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_venue_rate_cards_updated_at BEFORE UPDATE ON public.venue_rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Creative specifications per venue ---------------------------------------
CREATE TABLE public.venue_creative_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  format text NOT NULL,                         -- image|video|text
  width_px integer NOT NULL,
  height_px integer NOT NULL,
  aspect_ratio text NOT NULL,                   -- '16:9', '9:16', '1:1'
  max_file_size_mb integer NOT NULL DEFAULT 50,
  accepted_mime_types text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','video/mp4'],
  max_duration_sec integer,                     -- for video
  color_profile text DEFAULT 'sRGB',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.venue_creative_specs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_creative_specs TO authenticated;
GRANT ALL ON public.venue_creative_specs TO service_role;
ALTER TABLE public.venue_creative_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specs public read" ON public.venue_creative_specs FOR SELECT USING (true);
CREATE POLICY "Partners manage own specs" ON public.venue_creative_specs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.venues v JOIN public.ad_partners p ON p.id = v.partner_id WHERE v.id = venue_id AND p.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.venues v JOIN public.ad_partners p ON p.id = v.partner_id WHERE v.id = venue_id AND p.owner_user_id = auth.uid()));
CREATE POLICY "Admins manage all specs" ON public.venue_creative_specs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_venue_creative_specs_updated_at BEFORE UPDATE ON public.venue_creative_specs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RFPs (Request For Proposal / media brief) -------------------------------
CREATE TABLE public.ad_rfps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  campaign_name text NOT NULL,
  brief text NOT NULL,
  objective text,                               -- awareness|traffic|sales|launch
  target_audience text,
  target_countries text[],
  target_cities text[],
  budget_pi numeric NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  preferred_formats text[] DEFAULT ARRAY['image','video'],
  creative_id uuid REFERENCES public.creatives(id),
  status text NOT NULL DEFAULT 'open',          -- open|closed|awarded|cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_rfps TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_rfps TO authenticated;
GRANT ALL ON public.ad_rfps TO service_role;
ALTER TABLE public.ad_rfps ENABLE ROW LEVEL SECURITY;
-- RFPs visible to all approved partners so they can bid; advertiser identity via Pi is opaque
CREATE POLICY "RFPs open read" ON public.ad_rfps FOR SELECT USING (status IN ('open','awarded'));
CREATE POLICY "Service role writes RFPs" ON public.ad_rfps FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ad_rfps_updated_at BEFORE UPDATE ON public.ad_rfps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Proposals / quotes from partners in response to an RFP ------------------
CREATE TABLE public.ad_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id uuid NOT NULL REFERENCES public.ad_rfps(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.ad_partners(id) ON DELETE CASCADE,
  venue_ids uuid[] NOT NULL,
  proposed_start date NOT NULL,
  proposed_end date NOT NULL,
  estimated_impressions bigint NOT NULL,
  price_pi numeric NOT NULL,
  discount_pct numeric NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'submitted',     -- submitted|accepted|rejected|withdrawn|expired
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_proposals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_proposals TO authenticated;
GRANT ALL ON public.ad_proposals TO service_role;
ALTER TABLE public.ad_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proposals visible to owning partner and public accepted" ON public.ad_proposals FOR SELECT USING (
  status = 'accepted' OR
  EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Partners submit proposals" ON public.ad_proposals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid() AND p.status = 'approved'));
CREATE POLICY "Partners update own proposals" ON public.ad_proposals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()));
CREATE TRIGGER trg_ad_proposals_updated_at BEFORE UPDATE ON public.ad_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Insertion Orders — formal booking doc linking contract + proposal -------
CREATE TABLE public.insertion_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  io_number text NOT NULL UNIQUE,               -- human-readable IO-2026-000123
  contract_id uuid REFERENCES public.ad_contracts(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.ad_proposals(id) ON DELETE SET NULL,
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  partner_id uuid NOT NULL REFERENCES public.ad_partners(id),
  campaign_name text NOT NULL,
  flight_start date NOT NULL,
  flight_end date NOT NULL,
  gross_pi numeric NOT NULL,
  agency_commission_pct numeric NOT NULL DEFAULT 0,   -- traditional 15%
  net_pi numeric NOT NULL,
  payment_terms text NOT NULL DEFAULT 'prepaid',      -- prepaid|net15|net30|net60
  terms_json jsonb NOT NULL DEFAULT '{}'::jsonb,      -- cancellation, make-good, etc.
  status text NOT NULL DEFAULT 'issued',        -- issued|acknowledged|active|completed|cancelled
  signed_by_advertiser_at timestamptz,
  signed_by_partner_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.insertion_orders TO authenticated;
GRANT ALL ON public.insertion_orders TO service_role;
ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "IOs visible to partner or admin" ON public.insertion_orders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Partners update own IOs" ON public.insertion_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()));
CREATE TRIGGER trg_insertion_orders_updated_at BEFORE UPDATE ON public.insertion_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Proof of play — verification records ------------------------------------
CREATE TABLE public.proof_of_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.ad_placements(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.ad_contracts(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id),
  played_at timestamptz NOT NULL DEFAULT now(),
  duration_sec integer NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  photo_url text,                               -- venue-cam snapshot
  device_id text,
  signature text,                               -- signed by venue player
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.proof_of_plays TO anon, authenticated;
GRANT INSERT ON public.proof_of_plays TO authenticated;
GRANT ALL ON public.proof_of_plays TO service_role;
ALTER TABLE public.proof_of_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proof of play public read" ON public.proof_of_plays FOR SELECT USING (true);
CREATE POLICY "Partners insert own plays" ON public.proof_of_plays FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.venues v JOIN public.ad_partners p ON p.id = v.partner_id
    WHERE v.id = venue_id AND p.owner_user_id = auth.uid()
  ));

-- 7. Invoices ----------------------------------------------------------------
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,          -- INV-2026-000123
  insertion_order_id uuid REFERENCES public.insertion_orders(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.ad_contracts(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.ad_partners(id),
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  subtotal_pi numeric NOT NULL,
  tax_pi numeric NOT NULL DEFAULT 0,
  total_pi numeric NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  paid_at timestamptz,
  pi_txid text,
  status text NOT NULL DEFAULT 'issued',        -- issued|paid|overdue|void|refunded
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoices visible to owning partner or admin" ON public.invoices FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Make-goods — replacement placements when delivery misses ---------------
CREATE TABLE public.make_goods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_placement_id uuid NOT NULL REFERENCES public.ad_placements(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.ad_contracts(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.ad_partners(id),
  reason text NOT NULL,                         -- underdelivery|technical|weather|other
  shortfall_impressions bigint NOT NULL DEFAULT 0,
  compensation_type text NOT NULL DEFAULT 'extra_plays',  -- extra_plays|refund|credit
  compensation_value numeric NOT NULL,
  replacement_placement_id uuid REFERENCES public.ad_placements(id),
  status text NOT NULL DEFAULT 'proposed',      -- proposed|accepted|delivered|refunded|rejected
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.make_goods TO authenticated;
GRANT ALL ON public.make_goods TO service_role;
ALTER TABLE public.make_goods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Make-goods visible to partner or admin" ON public.make_goods FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Partners write own make-goods" ON public.make_goods FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()));
CREATE TRIGGER trg_make_goods_updated_at BEFORE UPDATE ON public.make_goods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Helpful indexes ---------------------------------------------------------
CREATE INDEX idx_rate_cards_venue ON public.venue_rate_cards(venue_id) WHERE active;
CREATE INDEX idx_specs_venue ON public.venue_creative_specs(venue_id);
CREATE INDEX idx_proposals_rfp ON public.ad_proposals(rfp_id);
CREATE INDEX idx_proposals_partner ON public.ad_proposals(partner_id);
CREATE INDEX idx_io_partner ON public.insertion_orders(partner_id);
CREATE INDEX idx_io_contract ON public.insertion_orders(contract_id);
CREATE INDEX idx_pop_placement ON public.proof_of_plays(placement_id);
CREATE INDEX idx_pop_played_at ON public.proof_of_plays(played_at DESC);
CREATE INDEX idx_invoices_partner ON public.invoices(partner_id);
CREATE INDEX idx_make_goods_partner ON public.make_goods(partner_id);
CREATE INDEX idx_rfps_status ON public.ad_rfps(status) WHERE status = 'open';

-- 10. Seed default rate cards + creative specs for existing venues -----------
INSERT INTO public.venue_rate_cards (venue_id, partner_id, label, cpm_pi, daily_rate_pi, weekly_rate_pi, monthly_rate_pi)
SELECT v.id, v.partner_id, 'Standard',
  ROUND((v.base_rate_pi / GREATEST(v.daily_impressions,1) * 1000)::numeric, 4),
  v.base_rate_pi,
  v.base_rate_pi * 6.5,
  v.base_rate_pi * 26
FROM public.venues v
WHERE v.partner_id IS NOT NULL AND v.active
ON CONFLICT DO NOTHING;

INSERT INTO public.venue_creative_specs (venue_id, format, width_px, height_px, aspect_ratio, max_duration_sec)
SELECT v.id, 'image', 1920, 1080, '16:9', NULL FROM public.venues v WHERE v.active
UNION ALL
SELECT v.id, 'video', 1920, 1080, '16:9', 15 FROM public.venues v WHERE v.active
ON CONFLICT DO NOTHING;
