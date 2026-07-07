
-- =========================================================
-- Roles
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'partner', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- =========================================================
-- Ad Partners
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ad_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_email text NOT NULL,
  country text NOT NULL,
  website text,
  billboards_summary text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  revenue_share_pct numeric NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ad_partners TO authenticated;
GRANT SELECT ON public.ad_partners TO anon;
GRANT ALL ON public.ad_partners TO service_role;
ALTER TABLE public.ad_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners read approved public" ON public.ad_partners FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "partners read own or admin" ON public.ad_partners FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR status = 'approved');
CREATE POLICY "partners insert own" ON public.ad_partners FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "partners update own or admin" ON public.ad_partners FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_ad_partners_updated_at BEFORE UPDATE ON public.ad_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Venues
-- =========================================================
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  sport text NOT NULL,
  placement text NOT NULL,
  city text,
  country text,
  region text,
  daily_impressions integer NOT NULL DEFAULT 100000,
  base_rate_pi numeric NOT NULL DEFAULT 5,
  partner_id uuid REFERENCES public.ad_partners(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.venues TO anon, authenticated;
GRANT INSERT, UPDATE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues public read" ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues partner insert" ON public.venues FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid() AND p.status = 'approved') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "venues partner update" ON public.venues FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Creatives
-- =========================================================
CREATE TABLE IF NOT EXISTS public.creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid text NOT NULL,
  pi_username text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('text','image','video')),
  name text NOT NULL,
  spec jsonb NOT NULL,
  preview_url text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.creatives TO service_role;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
-- Access only via server routes (service role bypasses RLS). No client policies.
CREATE TRIGGER update_creatives_updated_at BEFORE UPDATE ON public.creatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Brand presets
-- =========================================================
CREATE TABLE IF NOT EXISTS public.brand_presets (
  pi_uid text PRIMARY KEY,
  pi_username text NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#3B82F6',
  secondary_color text DEFAULT '#0F172A',
  tagline text,
  font_family text DEFAULT 'Inter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.brand_presets TO service_role;
ALTER TABLE public.brand_presets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_brand_presets_updated_at BEFORE UPDATE ON public.brand_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Approval requests
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ad_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.ad_contracts(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.ad_partners(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','changes_requested')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, partner_id)
);
GRANT SELECT, UPDATE ON public.ad_approval_requests TO authenticated;
GRANT ALL ON public.ad_approval_requests TO service_role;
ALTER TABLE public.ad_approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval read by partner or admin" ON public.ad_approval_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid())
  );
CREATE POLICY "approval update by partner or admin" ON public.ad_approval_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = partner_id AND p.owner_user_id = auth.uid())
  );
CREATE TRIGGER update_ad_approval_requests_updated_at BEFORE UPDATE ON public.ad_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Extend existing contract/placement tables
-- =========================================================
ALTER TABLE public.ad_contracts ADD COLUMN IF NOT EXISTS creative_id uuid REFERENCES public.creatives(id) ON DELETE SET NULL;
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS approval_request_id uuid REFERENCES public.ad_approval_requests(id) ON DELETE SET NULL;
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.ad_partners(id) ON DELETE SET NULL;

-- =========================================================
-- Seed: demo partner + venues
-- =========================================================
INSERT INTO public.ad_partners (id, company_name, contact_email, country, website, billboards_summary, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Lovable Demo Network',
  'demo@lovable.dev',
  'Global',
  'https://lovable.dev',
  'Demo global network of 16 flagship sports & esports venues.',
  'approved'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.venues (code, name, sport, placement, city, country, region, daily_impressions, base_rate_pi, partner_id, active) VALUES
('MNU','Old Trafford, Manchester','Soccer','stadium','Manchester','UK','EU',450000,8,'00000000-0000-0000-0000-000000000001',true),
('BAR','Camp Nou, Barcelona','Soccer','stadium','Barcelona','Spain','EU',480000,8,'00000000-0000-0000-0000-000000000001',true),
('MAD','Santiago Bernabéu, Madrid','Soccer','stadium','Madrid','Spain','EU',470000,8,'00000000-0000-0000-0000-000000000001',true),
('MUN','Allianz Arena, Munich','Soccer','stadium','Munich','Germany','EU',440000,7,'00000000-0000-0000-0000-000000000001',true),
('LAL','Crypto.com Arena, LA','Basketball','arena','Los Angeles','USA','NA',380000,9,'00000000-0000-0000-0000-000000000001',true),
('NYK','Madison Square Garden, NY','Basketball','arena','New York','USA','NA',400000,10,'00000000-0000-0000-0000-000000000001',true),
('BOS','TD Garden, Boston','Basketball','arena','Boston','USA','NA',300000,7,'00000000-0000-0000-0000-000000000001',true),
('MON','Circuit de Monaco','F1','racetrack','Monaco','Monaco','EU',260000,12,'00000000-0000-0000-0000-000000000001',true),
('SIL','Silverstone Circuit','F1','racetrack','Silverstone','UK','EU',280000,10,'00000000-0000-0000-0000-000000000001',true),
('COT','Circuit of the Americas','F1','racetrack','Austin','USA','NA',270000,10,'00000000-0000-0000-0000-000000000001',true),
('TYO','Tokyo Dome','Baseball','stadium','Tokyo','Japan','APAC',350000,8,'00000000-0000-0000-0000-000000000001',true),
('SEO','Gocheok Sky Dome, Seoul','Baseball','stadium','Seoul','South Korea','APAC',320000,7,'00000000-0000-0000-0000-000000000001',true),
('ESL','ESL Katowice Arena','Esports','esports','Katowice','Poland','EU',180000,6,'00000000-0000-0000-0000-000000000001',true),
('TIL','The International, Seattle','Esports','esports','Seattle','USA','NA',200000,7,'00000000-0000-0000-0000-000000000001',true),
('SGP','Marina Bay Street Circuit','F1','racetrack','Singapore','Singapore','APAC',260000,11,'00000000-0000-0000-0000-000000000001',true),
('SAO','Maracanã, Rio de Janeiro','Soccer','stadium','Rio de Janeiro','Brazil','LATAM',430000,7,'00000000-0000-0000-0000-000000000001',true)
ON CONFLICT (code) DO NOTHING;
