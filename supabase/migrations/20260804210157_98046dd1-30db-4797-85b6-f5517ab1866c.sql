-- 1. ad_partners: explicit admin-only DELETE
DROP POLICY IF EXISTS "partners delete admin only" ON public.ad_partners;
CREATE POLICY "partners delete admin only"
ON public.ad_partners FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. bookings: writes only via SECURITY DEFINER functions / service_role
DROP POLICY IF EXISTS "bookings deny client insert" ON public.bookings;
CREATE POLICY "bookings deny client insert"
ON public.bookings AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "bookings deny client update" ON public.bookings;
CREATE POLICY "bookings deny client update"
ON public.bookings AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "bookings deny client delete" ON public.bookings;
CREATE POLICY "bookings deny client delete"
ON public.bookings AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (false);

-- 3. plays: ownership-scoped SELECT
DROP POLICY IF EXISTS "plays visibility" ON public.plays;
CREATE POLICY "plays visibility"
ON public.plays FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = plays.booking_id
      AND (
        b.advertiser_pi_uid IN (
          SELECT p.owner_pi_uid FROM public.ad_partners p WHERE p.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.billboard_locations bl
          WHERE bl.id = b.location_id
            AND bl.partner_id IS NOT NULL
            AND public.is_partner_staff(auth.uid(), bl.partner_id)
        )
      )
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- 4. screen_reports: ingestion is service_role only
DROP POLICY IF EXISTS "screen reports deny client insert" ON public.screen_reports;
CREATE POLICY "screen reports deny client insert"
ON public.screen_reports AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "screen reports deny client update" ON public.screen_reports;
CREATE POLICY "screen reports deny client update"
ON public.screen_reports AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "screen reports deny client delete" ON public.screen_reports;
CREATE POLICY "screen reports deny client delete"
ON public.screen_reports AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (false);
