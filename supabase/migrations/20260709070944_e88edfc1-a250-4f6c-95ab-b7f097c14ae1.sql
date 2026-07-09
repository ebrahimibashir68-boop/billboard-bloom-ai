
-- 1. ad_proposals: remove public accepted branch
DROP POLICY IF EXISTS "Proposals visible to owning partner and public accepted" ON public.ad_proposals;
CREATE POLICY "Proposals visible to owning partner or admin"
ON public.ad_proposals FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.ad_partners p WHERE p.id = ad_proposals.partner_id AND p.owner_user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
REVOKE SELECT ON public.ad_proposals FROM anon;

-- 2. proof_of_plays: restrict to owning partner (via venues) or admin
DROP POLICY IF EXISTS "Proof of play public read" ON public.proof_of_plays;
CREATE POLICY "Proof of play visible to owning partner or admin"
ON public.proof_of_plays FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venues v
    JOIN public.ad_partners p ON p.id = v.partner_id
    WHERE v.id = proof_of_plays.venue_id AND p.owner_user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
REVOKE SELECT ON public.proof_of_plays FROM anon;

-- 3. venue_rate_cards: restrict public read to authenticated users only
DROP POLICY IF EXISTS "Rate cards public read" ON public.venue_rate_cards;
CREATE POLICY "Rate cards readable by authenticated"
ON public.venue_rate_cards FOR SELECT TO authenticated
USING (active = true);
REVOKE SELECT ON public.venue_rate_cards FROM anon;

-- 4. Convert has_role to SECURITY INVOKER (relies on user_roles RLS "read own roles")
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
