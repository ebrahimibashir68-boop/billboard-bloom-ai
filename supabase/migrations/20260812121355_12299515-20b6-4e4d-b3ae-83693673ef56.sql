-- 1) billboard_locations: require approved partner status for partner writes
DROP POLICY IF EXISTS "locations partner manage" ON public.billboard_locations;
CREATE POLICY "locations partner manage" ON public.billboard_locations
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ad_partners p
            WHERE p.id = billboard_locations.partner_id
              AND p.owner_user_id = auth.uid()
              AND p.status = 'approved')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ad_partners p
            WHERE p.id = billboard_locations.partner_id
              AND p.owner_user_id = auth.uid()
              AND p.status = 'approved')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 2) venues: require approved partner status for updates (match insert policy)
DROP POLICY IF EXISTS "venues partner update" ON public.venues;
CREATE POLICY "venues partner update" ON public.venues
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.ad_partners p
            WHERE p.id = venues.partner_id
              AND p.owner_user_id = auth.uid()
              AND p.status = 'approved')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ad_partners p
            WHERE p.id = venues.partner_id
              AND p.owner_user_id = auth.uid()
              AND p.status = 'approved')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 3) ad_partners: ensure no anon read surface on sensitive business/financial data
REVOKE ALL ON public.ad_partners FROM anon;
COMMENT ON TABLE public.ad_partners IS
  'Sensitive partner business data (contact_email, payout_wallet_address, revenue_share_pct). Never add SELECT policies or grants for anon/public; public consumers must use public_ad_partners view.';
