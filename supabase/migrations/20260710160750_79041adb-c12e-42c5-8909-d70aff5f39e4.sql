
CREATE TABLE public.billboard_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  lat numeric(9,6),
  lng numeric(9,6),
  size_meters text,
  resolution text,
  daily_impressions integer NOT NULL DEFAULT 0,
  hourly_pi_rate numeric NOT NULL DEFAULT 1,
  slot_seconds integer NOT NULL DEFAULT 15,
  image_url text,
  partner_id uuid REFERENCES public.ad_partners(id) ON DELETE SET NULL,
  is_programmatic boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billboard_locations TO anon, authenticated;
GRANT ALL ON public.billboard_locations TO service_role;
ALTER TABLE public.billboard_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations public read active" ON public.billboard_locations
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "locations partner manage" ON public.billboard_locations
  FOR ALL TO authenticated
  USING (partner_id IN (SELECT id FROM public.ad_partners WHERE owner_user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (partner_id IN (SELECT id FROM public.ad_partners WHERE owner_user_id = auth.uid())
              OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.partner_admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.ad_partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id, user_id)
);
GRANT SELECT ON public.partner_admin_assignments TO authenticated;
GRANT ALL ON public.partner_admin_assignments TO service_role;
ALTER TABLE public.partner_admin_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments read own" ON public.partner_admin_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR partner_id IN (SELECT id FROM public.ad_partners WHERE owner_user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.is_partner_staff(_user uuid, _partner uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.ad_partners WHERE id=_partner AND owner_user_id=_user)
      OR EXISTS(SELECT 1 FROM public.partner_admin_assignments WHERE partner_id=_partner AND user_id=_user);
$$;
REVOKE EXECUTE ON FUNCTION public.is_partner_staff(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_partner_staff(uuid,uuid) TO authenticated;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS booking_id uuid;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  location_id uuid NOT NULL REFERENCES public.billboard_locations(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  hours integer NOT NULL CHECK (hours BETWEEN 1 AND 720),
  quoted_pi numeric NOT NULL,
  platform_fee_pi numeric NOT NULL,
  total_pi numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings visibility" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    advertiser_pi_uid IN (SELECT owner_pi_uid FROM public.ad_partners WHERE owner_user_id = auth.uid())
    OR location_id IN (
      SELECT bl.id FROM public.billboard_locations bl
      WHERE bl.partner_id IS NOT NULL AND public.is_partner_staff(auth.uid(), bl.partner_id)
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TABLE public.plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.billboard_locations(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plays TO authenticated;
GRANT ALL ON public.plays TO service_role;
ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plays visibility" ON public.plays
  FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM public.bookings));

CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON public.billboard_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.create_booking(
  p_pi_uid text, p_pi_username text, p_campaign_id uuid,
  p_location_id uuid, p_starts_at timestamptz, p_hours integer
) RETURNS TABLE(booking_id uuid, invoice_id uuid, total_pi numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_loc public.billboard_locations%ROWTYPE;
  v_quote numeric; v_fee numeric; v_total numeric;
  v_status text; v_booking uuid; v_invoice uuid; v_num text;
BEGIN
  IF p_hours <= 0 THEN RAISE EXCEPTION 'invalid_hours'; END IF;
  SELECT * INTO v_loc FROM public.billboard_locations WHERE id = p_location_id AND active = true;
  IF v_loc.id IS NULL THEN RAISE EXCEPTION 'location_not_found'; END IF;
  v_quote := v_loc.hourly_pi_rate * p_hours;
  v_fee := round(v_quote * 0.08, 4);
  v_total := v_quote + v_fee;
  v_status := CASE WHEN v_loc.is_programmatic THEN 'approved' ELSE 'pending' END;

  INSERT INTO public.bookings(campaign_id, advertiser_pi_uid, advertiser_pi_username,
    location_id, starts_at, hours, quoted_pi, platform_fee_pi, total_pi, status)
  VALUES (p_campaign_id, p_pi_uid, p_pi_username, p_location_id, p_starts_at, p_hours,
          v_quote, v_fee, v_total, v_status)
  RETURNING id INTO v_booking;

  v_num := 'INV-BK-' || to_char(now(),'YYYYMMDD') || '-' || substr(v_booking::text,1,8);
  INSERT INTO public.invoices(invoice_number, partner_id, booking_id,
    advertiser_pi_uid, advertiser_pi_username, subtotal_pi, tax_pi, total_pi,
    issued_at, due_at, status, line_items)
  VALUES (v_num, v_loc.partner_id, v_booking, p_pi_uid, p_pi_username,
          v_quote, v_fee, v_total, now(), now() + interval '7 days', 'issued',
          jsonb_build_array(jsonb_build_object(
            'location', v_loc.name, 'hours', p_hours,
            'hourly_rate', v_loc.hourly_pi_rate, 'platform_fee', v_fee)))
  RETURNING id INTO v_invoice;

  UPDATE public.bookings SET invoice_id = v_invoice WHERE id = v_booking;
  booking_id := v_booking; invoice_id := v_invoice; total_pi := v_total;
  RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_booking(text,text,uuid,uuid,timestamptz,integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.pay_booking_invoice(p_pi_uid text, p_invoice_id uuid)
RETURNS TABLE(new_balance numeric, plays_created integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_inv public.invoices%ROWTYPE; v_bk public.bookings%ROWTYPE;
  v_bal numeric; v_loc public.billboard_locations%ROWTYPE;
  v_plays integer := 0; v_imp integer; v_per_hr integer;
  v_t timestamptz; v_end timestamptz; i integer;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_inv.id IS NULL OR v_inv.advertiser_pi_uid <> p_pi_uid THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_inv.status = 'paid' THEN RAISE EXCEPTION 'already_paid'; END IF;
  IF v_inv.booking_id IS NULL THEN RAISE EXCEPTION 'not_a_booking_invoice'; END IF;
  SELECT * INTO v_bk FROM public.bookings WHERE id = v_inv.booking_id FOR UPDATE;
  IF v_bk.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  SELECT balance INTO v_bal FROM public.pi_balances WHERE pi_uid = p_pi_uid FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_inv.total_pi THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  UPDATE public.pi_balances SET balance = balance - v_inv.total_pi, updated_at = now()
    WHERE pi_uid = p_pi_uid RETURNING balance INTO v_bal;

  UPDATE public.invoices SET status='paid', paid_at=now(),
    pi_txid='SIM-'||substr(gen_random_uuid()::text,1,12) WHERE id = p_invoice_id;
  UPDATE public.bookings SET status='running' WHERE id = v_bk.id;

  SELECT * INTO v_loc FROM public.billboard_locations WHERE id = v_bk.location_id;
  v_per_hr := 4;
  v_imp := GREATEST(1, floor(v_loc.daily_impressions::numeric / 24 / v_per_hr)::int);
  v_t := v_bk.starts_at; v_end := v_bk.starts_at + (v_bk.hours || ' hours')::interval;
  WHILE v_t < v_end LOOP
    FOR i IN 1..v_per_hr LOOP
      INSERT INTO public.plays(booking_id, location_id, played_at, impressions)
      VALUES (v_bk.id, v_bk.location_id,
              v_t + make_interval(mins => (60/v_per_hr)*(i-1)),
              v_imp);
      v_plays := v_plays + 1;
    END LOOP;
    v_t := v_t + interval '1 hour';
  END LOOP;

  new_balance := v_bal; plays_created := v_plays; RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pay_booking_invoice(text,uuid) FROM PUBLIC, anon, authenticated;

INSERT INTO public.ad_partners(company_name, contact_email, country, status, revenue_share_pct)
SELECT * FROM (VALUES
 ('Ocean Outdoor','partners@oceanoutdoor.com','United Kingdom','approved',65.0),
 ('Intersection','partners@intersection.com','United States','approved',65.0),
 ('Branded Cities','sales@brandedcities.com','United States','approved',60.0),
 ('Daktronics','ooh@daktronics.com','United States','approved',60.0),
 ('APG|SGA','contact@apgsga.ch','Switzerland','approved',62.0),
 ('Talon Outdoor','hello@talonooh.com','United Kingdom','approved',60.0),
 ('Pattison Outdoor','info@pattisonoutdoor.com','Canada','approved',62.0),
 ('Astral Out-of-Home','info@astralooh.com','Canada','approved',60.0),
 ('TAM Media','partners@tammedia.in','India','approved',58.0),
 ('Interbest','sales@interbest.nl','Netherlands','approved',60.0),
 ('Alma DDB Outdoor','ooh@almaddb.com','Spain','approved',58.0),
 ('Adshel MENA','partners@adshel.ae','United Arab Emirates','approved',62.0),
 ('Focus Elevator Media','sales@focusmedia.cn','China','approved',60.0),
 ('JCDecaux Airports','airports@jcdecaux.com','France','approved',65.0),
 ('Global Outdoor','ooh@global.com','United Kingdom','approved',62.0)
) AS v(company_name, contact_email, country, status, revenue_share_pct)
WHERE NOT EXISTS (SELECT 1 FROM public.ad_partners ap WHERE ap.company_name = v.company_name);

INSERT INTO public.billboard_locations
 (slug,name,city,country,lat,lng,size_meters,resolution,daily_impressions,hourly_pi_rate,slot_seconds,partner_id,is_programmatic,image_url)
SELECT v.slug, v.name, v.city, v.country, v.lat, v.lng, v.size_meters, v.resolution,
       v.daily_impressions, v.hourly_pi_rate, v.slot_seconds,
       (SELECT id FROM public.ad_partners WHERE company_name = v.partner_name LIMIT 1),
       v.is_programmatic, v.image_url
FROM (VALUES
 ('one-times-square','One Times Square','New York','United States',40.756054,-73.986260,'23x18','2688x2016',350000,120.0,15,'Branded Cities',true,'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=800'),
 ('nasdaq-tower','Nasdaq MarketSite Tower','New York','United States',40.756480,-73.986000,'36x25','3840x2160',420000,150.0,15,'Branded Cities',true,'https://images.unsplash.com/photo-1543832923-44667a44c804?w=800'),
 ('piccadilly-lights','Piccadilly Lights','London','United Kingdom',51.510067,-0.134629,'44x25','4032x2352',380000,140.0,10,'Ocean Outdoor',true,'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=800'),
 ('shibuya-q-front','Shibuya Q-Front','Tokyo','Japan',35.658034,139.700711,'22x18','2560x1920',450000,130.0,15,'JCDecaux Airports',true,'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800'),
 ('burj-khalifa-facade','Burj Khalifa Facade','Dubai','United Arab Emirates',25.197197,55.274376,'828x60','n/a',600000,300.0,30,'Adshel MENA',false,'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=800'),
 ('k11-musea','K11 Musea Facade','Hong Kong','Hong Kong',22.294560,114.171540,'50x30','5120x2880',280000,110.0,20,'Focus Elevator Media',true,'https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=800'),
 ('nanjing-road','Nanjing Road Digital Mile','Shanghai','China',31.235416,121.480222,'80x14','7680x1344',520000,160.0,15,'Focus Elevator Media',true,'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800'),
 ('sofi-oculus','SoFi Stadium Oculus','Los Angeles','United States',33.953587,-118.339104,'110x27','7680x1080',250000,180.0,30,'Daktronics',false,'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800'),
 ('msg-jumbotron','Madison Square Garden Center Hung','New York','United States',40.750504,-73.993439,'20x11','1920x1080',80000,90.0,20,'Daktronics',false,'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800'),
 ('champs-elysees','Champs-Elysees Digital','Paris','France',48.869867,2.307700,'8x6','1920x1440',180000,95.0,15,'JCDecaux Airports',true,'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=800'),
 ('ginza-crossing','Ginza Sony Corner','Tokyo','Japan',35.671737,139.763907,'12x10','2048x1536',220000,100.0,15,'JCDecaux Airports',true,'https://images.unsplash.com/photo-1533050487297-09b450131914?w=800'),
 ('sheikh-zayed-road','Sheikh Zayed Road Gantry','Dubai','United Arab Emirates',25.213000,55.278000,'20x8','2560x1024',300000,85.0,10,'Adshel MENA',true,'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800'),
 ('lhr-t5-arrivals','Heathrow T5 Arrivals Digital','London','United Kingdom',51.472775,-0.452517,'6x3','1920x960',95000,70.0,15,'JCDecaux Airports',true,'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800'),
 ('jfk-t4-portal','JFK Terminal 4 Media Portal','New York','United States',40.643086,-73.788867,'5x3','1920x1080',110000,75.0,15,'JCDecaux Airports',true,'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800'),
 ('leicester-square','Leicester Square Digital','London','United Kingdom',51.510740,-0.130320,'15x7','2560x1200',210000,90.0,15,'Ocean Outdoor',true,'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800'),
 ('kings-cross-outernet','Outernet Kings Cross','London','United Kingdom',51.516350,-0.128630,'30x16','8192x4608',260000,170.0,10,'Ocean Outdoor',true,'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800'),
 ('yonge-dundas','Yonge-Dundas Square','Toronto','Canada',43.656327,-79.380576,'20x10','2560x1280',180000,80.0,15,'Pattison Outdoor',true,'https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=800'),
 ('marina-bay-helix','Marina Bay Helix Bridge','Singapore','Singapore',1.286300,103.859500,'10x5','1920x960',150000,85.0,15,'JCDecaux Airports',true,'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800'),
 ('bahnhofstrasse','Bahnhofstrasse Digital','Zurich','Switzerland',47.372700,8.539200,'6x4','1920x1280',120000,70.0,15,'APG|SGA',true,'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800'),
 ('puerta-del-sol','Puerta del Sol Digital','Madrid','Spain',40.416729,-3.703339,'12x8','2048x1365',170000,80.0,15,'Alma DDB Outdoor',true,'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800'),
 ('sydney-cbd-tower','Sydney CBD Tower','Sydney','Australia',-33.867487,151.206990,'15x8','2560x1280',160000,85.0,15,'JCDecaux Airports',true,'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800'),
 ('mumbai-marine','Mumbai Marine Drive','Mumbai','India',18.943708,72.823440,'20x10','2560x1280',300000,60.0,15,'TAM Media',true,'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800'),
 ('a2-interbest','A2 Interbest Highway','Amsterdam','Netherlands',52.290000,4.870000,'36x9','n/a',420000,110.0,10,'Interbest',false,'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'),
 ('cdg-t2e-portal','CDG Terminal 2E Portal','Paris','France',49.009690,2.547780,'8x4','1920x960',130000,75.0,15,'JCDecaux Airports',true,'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800')
) AS v(slug,name,city,country,lat,lng,size_meters,resolution,daily_impressions,hourly_pi_rate,slot_seconds,partner_name,is_programmatic,image_url)
ON CONFLICT (slug) DO NOTHING;
