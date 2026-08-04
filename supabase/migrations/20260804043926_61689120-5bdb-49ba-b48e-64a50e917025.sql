-- Advertiser briefs: remove blanket authenticated read
DROP POLICY IF EXISTS "RFPs open read authenticated" ON public.ad_rfps;

CREATE POLICY "RFPs readable by partner staff and admins"
ON public.ad_rfps
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.ad_partners p
    WHERE p.status = 'approved'
      AND public.is_partner_staff(auth.uid(), p.id)
  )
);

-- Partner pricing: remove blanket authenticated read
DROP POLICY IF EXISTS "Rate cards readable by authenticated" ON public.venue_rate_cards;

CREATE POLICY "Rate cards readable by owning partner and admins"
ON public.venue_rate_cards
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_partner_staff(auth.uid(), partner_id)
);