-- Media planning (GRP / reach / frequency)
CREATE TABLE public.media_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  campaign_name text NOT NULL,
  markets text[] NOT NULL DEFAULT '{}',
  target_population bigint NOT NULL,
  flight_start date NOT NULL,
  flight_end date NOT NULL,
  budget_pi numeric NOT NULL,
  cpm_pi numeric NOT NULL,
  planned_impressions bigint NOT NULL,
  grps numeric NOT NULL,
  reach_pct numeric NOT NULL,
  avg_frequency numeric NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.media_plans TO service_role;
ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_plans_server_only" ON public.media_plans FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE TRIGGER trg_media_plans_updated_at BEFORE UPDATE ON public.media_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Avails & holds
CREATE TABLE public.inventory_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  location_id uuid REFERENCES public.billboard_locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  hold_start date NOT NULL,
  hold_end date NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'hold',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.inventory_holds TO service_role;
ALTER TABLE public.inventory_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_holds_server_only" ON public.inventory_holds FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE TRIGGER trg_inventory_holds_updated_at BEFORE UPDATE ON public.inventory_holds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Production & installation
CREATE TABLE public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  location_id uuid REFERENCES public.billboard_locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  material text NOT NULL,
  width_m numeric NOT NULL,
  height_m numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  install_date date NOT NULL,
  removal_date date,
  production_cost_pi numeric NOT NULL,
  install_cost_pi numeric NOT NULL,
  total_pi numeric NOT NULL,
  status text NOT NULL DEFAULT 'ordered',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.production_orders TO service_role;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "production_orders_server_only" ON public.production_orders FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE TRIGGER trg_production_orders_updated_at BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proof of posting (physical faces)
CREATE TABLE public.posting_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid text NOT NULL,
  pi_username text,
  production_order_id uuid REFERENCES public.production_orders(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.billboard_locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  photo_url text,
  lat numeric,
  lng numeric,
  posted_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  ledger_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.posting_proofs TO service_role;
ALTER TABLE public.posting_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posting_proofs_server_only" ON public.posting_proofs FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Site & audience audits
CREATE TABLE public.site_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid text NOT NULL,
  pi_username text,
  location_id uuid REFERENCES public.billboard_locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  audit_source text NOT NULL,
  illumination text NOT NULL,
  condition text NOT NULL,
  obstruction_pct numeric NOT NULL DEFAULT 0,
  daily_traffic integer NOT NULL,
  score integer NOT NULL,
  audited_at date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.site_audits TO service_role;
ALTER TABLE public.site_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_audits_server_only" ON public.site_audits FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- Regulatory permits
CREATE TABLE public.site_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid text NOT NULL,
  pi_username text,
  location_id uuid REFERENCES public.billboard_locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  authority text NOT NULL,
  permit_number text NOT NULL,
  issued_on date NOT NULL,
  expires_on date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.site_permits TO service_role;
ALTER TABLE public.site_permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_permits_server_only" ON public.site_permits FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE TRIGGER trg_site_permits_updated_at BEFORE UPDATE ON public.site_permits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cancellation / renewal / extension / reschedule
CREATE TABLE public.campaign_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_pi_uid text NOT NULL,
  advertiser_pi_username text,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  reference text NOT NULL,
  change_type text NOT NULL,
  effective_date date NOT NULL,
  new_end_date date,
  reason text,
  penalty_pct numeric NOT NULL DEFAULT 0,
  penalty_pi numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.campaign_change_requests TO service_role;
ALTER TABLE public.campaign_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_change_requests_server_only" ON public.campaign_change_requests FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE TRIGGER trg_campaign_change_requests_updated_at BEFORE UPDATE ON public.campaign_change_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();