CREATE TABLE public.sponsorship_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  property_type text NOT NULL,
  property_name text NOT NULL,
  rights_package text NOT NULL,
  exclusivity text NOT NULL DEFAULT 'category',
  term_start date NOT NULL,
  term_end date NOT NULL,
  annual_fee_pi numeric NOT NULL,
  total_fee_pi numeric NOT NULL,
  est_media_value_pi numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'proposed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.transit_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  format text NOT NULL,
  city text NOT NULL,
  route_or_site text NOT NULL,
  units integer NOT NULL,
  weeks integer NOT NULL,
  unit_week_rate_pi numeric NOT NULL,
  total_pi numeric NOT NULL,
  weekly_impressions bigint NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.live_auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_pi_uid text NOT NULL,
  seller_pi_username text,
  venue_name text NOT NULL,
  event_name text NOT NULL,
  slot_label text NOT NULL,
  slot_seconds integer NOT NULL DEFAULT 30,
  est_impressions bigint NOT NULL DEFAULT 0,
  reserve_pi numeric NOT NULL,
  min_increment_pi numeric NOT NULL DEFAULT 1,
  current_bid_pi numeric,
  current_bidder_username text,
  bid_count integer NOT NULL DEFAULT 0,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
  bidder_pi_uid text NOT NULL,
  bidder_pi_username text,
  amount_pi numeric NOT NULL,
  ledger_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sponsorship_deals, public.transit_placements, public.live_auctions, public.auction_bids TO service_role;
ALTER TABLE public.sponsorship_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "server only" ON public.sponsorship_deals AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "server only" ON public.transit_placements AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "server only" ON public.live_auctions AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "server only" ON public.auction_bids AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_sponsorship_updated BEFORE UPDATE ON public.sponsorship_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_transit_updated BEFORE UPDATE ON public.transit_placements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_auctions_updated BEFORE UPDATE ON public.live_auctions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.place_auction_bid(p_auction_id uuid, p_pi_uid text, p_pi_username text, p_amount numeric)
RETURNS TABLE(bid_id uuid, current_bid numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.live_auctions%ROWTYPE; v_min numeric; v_id uuid; v_hash text;
BEGIN
  SELECT * INTO a FROM public.live_auctions WHERE id = p_auction_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status <> 'open' OR a.ends_at <= now() THEN RAISE EXCEPTION 'auction_closed'; END IF;
  IF a.seller_pi_uid = p_pi_uid THEN RAISE EXCEPTION 'own_auction'; END IF;
  v_min := CASE WHEN a.current_bid_pi IS NULL THEN a.reserve_pi ELSE a.current_bid_pi + a.min_increment_pi END;
  IF p_amount < v_min THEN RAISE EXCEPTION 'bid_too_low'; END IF;
  INSERT INTO public.auction_bids(auction_id, bidder_pi_uid, bidder_pi_username, amount_pi)
    VALUES (a.id, p_pi_uid, p_pi_username, p_amount) RETURNING id INTO v_id;
  v_hash := public.ledger_append('auction_bid', 'auction_bids', v_id,
    jsonb_build_object('auction_id', a.id, 'bidder', p_pi_username, 'amount_pi', p_amount));
  UPDATE public.auction_bids SET ledger_hash = v_hash WHERE id = v_id;
  UPDATE public.live_auctions SET current_bid_pi = p_amount, current_bidder_username = p_pi_username,
    bid_count = bid_count + 1 WHERE id = a.id;
  bid_id := v_id; current_bid := p_amount; RETURN NEXT;
END;$$;
REVOKE ALL ON FUNCTION public.place_auction_bid(uuid, text, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_auction_bid(uuid, text, text, numeric) TO service_role;