DROP POLICY IF EXISTS "RFPs open read" ON public.ad_rfps;
REVOKE SELECT ON public.ad_rfps FROM anon;
GRANT SELECT ON public.ad_rfps TO authenticated;
CREATE POLICY "RFPs open read authenticated" ON public.ad_rfps
  FOR SELECT TO authenticated
  USING (status IN ('open','awarded'));