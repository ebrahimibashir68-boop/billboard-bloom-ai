
-- Enable pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1. SCREENS (physical displayer devices)
-- =========================================================
CREATE TABLE public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  device_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  pi_uid TEXT,
  pi_username TEXT,
  partner_id UUID REFERENCES public.ad_partners(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.billboard_locations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'offline',
  orientation TEXT NOT NULL DEFAULT 'landscape',
  resolution TEXT,
  notes TEXT,
  last_ping_at TIMESTAMPTZ,
  current_booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (pi_uid IS NOT NULL OR partner_id IS NOT NULL)
);
CREATE INDEX screens_pi_uid_idx ON public.screens(pi_uid);
CREATE INDEX screens_partner_idx ON public.screens(partner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.screens TO authenticated;
GRANT ALL ON public.screens TO service_role;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff manage own screens" ON public.screens
  FOR ALL TO authenticated
  USING (partner_id IS NOT NULL AND public.is_partner_staff(auth.uid(), partner_id))
  WITH CHECK (partner_id IS NOT NULL AND public.is_partner_staff(auth.uid(), partner_id));

CREATE TRIGGER update_screens_updated_at BEFORE UPDATE ON public.screens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. SCREEN REPORTS (heartbeats + play acks from devices)
-- =========================================================
CREATE TABLE public.screen_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'heartbeat',
  impressions INTEGER NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX screen_reports_screen_idx ON public.screen_reports(screen_id, created_at DESC);

GRANT SELECT ON public.screen_reports TO authenticated;
GRANT ALL ON public.screen_reports TO service_role;
ALTER TABLE public.screen_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff read own screen reports" ON public.screen_reports
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.screens s
    WHERE s.id = screen_reports.screen_id
      AND s.partner_id IS NOT NULL
      AND public.is_partner_staff(auth.uid(), s.partner_id)
  ));

-- =========================================================
-- 3. LEDGER (hash-chained public proof)
-- =========================================================
CREATE TABLE public.ledger_entries (
  seq BIGSERIAL PRIMARY KEY,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  ref_table TEXT NOT NULL,
  ref_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  pi_txid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ledger_kind_idx ON public.ledger_entries(kind, created_at DESC);
CREATE INDEX ledger_ref_idx ON public.ledger_entries(ref_table, ref_id);

GRANT SELECT ON public.ledger_entries TO anon, authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public ledger read" ON public.ledger_entries
  FOR SELECT TO anon, authenticated USING (true);

-- Append helper (called by triggers)
CREATE OR REPLACE FUNCTION public.ledger_append(
  p_kind TEXT, p_table TEXT, p_ref_id UUID, p_payload JSONB, p_pi_txid TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prev TEXT; v_hash TEXT; v_body TEXT;
BEGIN
  SELECT hash INTO v_prev FROM public.ledger_entries ORDER BY seq DESC LIMIT 1;
  v_prev := COALESCE(v_prev, repeat('0', 64));
  v_body := v_prev || '|' || p_kind || '|' || p_table || '|' || COALESCE(p_ref_id::text, '') || '|' || p_payload::text || '|' || COALESCE(p_pi_txid, '');
  v_hash := encode(digest(v_body, 'sha256'), 'hex');
  INSERT INTO public.ledger_entries(prev_hash, hash, kind, ref_table, ref_id, payload, pi_txid)
    VALUES (v_prev, v_hash, p_kind, p_table, p_ref_id, p_payload, p_pi_txid);
  RETURN v_hash;
END;
$$;

-- Trigger fns
CREATE OR REPLACE FUNCTION public.trg_ledger_play() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ledger_append('play', 'plays', NEW.id,
    jsonb_build_object('booking_id', NEW.booking_id, 'location_id', NEW.location_id,
      'played_at', NEW.played_at, 'impressions', NEW.impressions));
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.trg_ledger_booking() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ledger_append('booking', 'bookings', NEW.id,
    jsonb_build_object('advertiser', NEW.advertiser_pi_username, 'location_id', NEW.location_id,
      'starts_at', NEW.starts_at, 'hours', NEW.hours, 'total_pi', NEW.total_pi));
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.trg_ledger_invoice_paid() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.ledger_append('payment', 'invoices', NEW.id,
      jsonb_build_object('invoice_number', NEW.invoice_number, 'total_pi', NEW.total_pi,
        'advertiser', NEW.advertiser_pi_username, 'partner_id', NEW.partner_id),
      NEW.pi_txid);
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS ledger_on_play ON public.plays;
CREATE TRIGGER ledger_on_play AFTER INSERT ON public.plays
  FOR EACH ROW EXECUTE FUNCTION public.trg_ledger_play();

DROP TRIGGER IF EXISTS ledger_on_booking ON public.bookings;
CREATE TRIGGER ledger_on_booking AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_ledger_booking();

DROP TRIGGER IF EXISTS ledger_on_invoice_paid ON public.invoices;
CREATE TRIGGER ledger_on_invoice_paid AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_ledger_invoice_paid();

-- Verification function
CREATE OR REPLACE FUNCTION public.verify_ledger_integrity()
RETURNS TABLE(ok BOOLEAN, checked BIGINT, first_bad_seq BIGINT)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE r RECORD; v_prev TEXT := repeat('0', 64); v_body TEXT; v_hash TEXT; v_count BIGINT := 0;
BEGIN
  FOR r IN SELECT seq, prev_hash, hash, kind, ref_table, ref_id, payload, pi_txid
           FROM public.ledger_entries ORDER BY seq ASC LOOP
    v_count := v_count + 1;
    v_body := v_prev || '|' || r.kind || '|' || r.ref_table || '|' || COALESCE(r.ref_id::text, '') || '|' || r.payload::text || '|' || COALESCE(r.pi_txid, '');
    v_hash := encode(digest(v_body, 'sha256'), 'hex');
    IF r.prev_hash <> v_prev OR r.hash <> v_hash THEN
      ok := false; checked := v_count; first_bad_seq := r.seq; RETURN NEXT; RETURN;
    END IF;
    v_prev := r.hash;
  END LOOP;
  ok := true; checked := v_count; first_bad_seq := NULL; RETURN NEXT;
END;$$;

GRANT EXECUTE ON FUNCTION public.verify_ledger_integrity() TO anon, authenticated;

-- =========================================================
-- 4. CREATIVE OPTIMIZATIONS (AI suggestions cache)
-- =========================================================
CREATE TABLE public.creative_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
  pi_uid TEXT NOT NULL,
  score INTEGER,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  headline_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX creative_opt_creative_idx ON public.creative_optimizations(creative_id, created_at DESC);

GRANT SELECT ON public.creative_optimizations TO authenticated;
GRANT ALL ON public.creative_optimizations TO service_role;
ALTER TABLE public.creative_optimizations ENABLE ROW LEVEL SECURITY;

-- Locked to service role (server routes verify pi_uid ownership before returning).
CREATE POLICY "No client access to optimizations" ON public.creative_optimizations
  FOR SELECT TO authenticated USING (false);

-- =========================================================
-- 5. Playlist function for screens
-- =========================================================
CREATE OR REPLACE FUNCTION public.screen_playlist(p_device_key TEXT)
RETURNS TABLE(
  screen_id UUID, screen_name TEXT, location_id UUID, location_name TEXT,
  booking_id UUID, creative_id UUID, creative_kind TEXT, creative_spec JSONB,
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, hours INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_screen public.screens%ROWTYPE;
BEGIN
  SELECT * INTO v_screen FROM public.screens WHERE device_key = p_device_key;
  IF v_screen.id IS NULL THEN RAISE EXCEPTION 'screen_not_found'; END IF;
  UPDATE public.screens SET last_ping_at = now(), status = 'online' WHERE id = v_screen.id;

  RETURN QUERY
  SELECT v_screen.id, v_screen.name, l.id, l.name, b.id, c.id, c.kind, c.spec,
         b.starts_at, b.starts_at + (b.hours || ' hours')::interval, b.hours
  FROM public.bookings b
  LEFT JOIN public.billboard_locations l ON l.id = b.location_id
  LEFT JOIN public.ad_campaigns ac ON ac.id = b.campaign_id
  LEFT JOIN public.creatives c ON c.pi_uid = b.advertiser_pi_uid
  WHERE b.location_id = v_screen.location_id
    AND b.status IN ('running', 'approved')
    AND b.starts_at <= now()
    AND (b.starts_at + (b.hours || ' hours')::interval) > now()
  ORDER BY b.starts_at DESC
  LIMIT 5;
END;$$;

GRANT EXECUTE ON FUNCTION public.screen_playlist(TEXT) TO anon, authenticated;
