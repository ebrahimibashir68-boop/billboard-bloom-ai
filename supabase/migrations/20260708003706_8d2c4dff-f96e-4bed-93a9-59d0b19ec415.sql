
-- 1) ad_partners: remove anon-readable contact_email exposure
DROP POLICY IF EXISTS "partners read approved public" ON public.ad_partners;
REVOKE SELECT ON public.ad_partners FROM anon;

-- Narrow the authenticated policy: no longer expose approved rows to signed-in strangers
DROP POLICY IF EXISTS "partners read own or admin" ON public.ad_partners;
CREATE POLICY "partners read own or admin" ON public.ad_partners FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Safe public view: no contact_email, no owner_user_id
CREATE OR REPLACE VIEW public.public_ad_partners
WITH (security_invoker = true) AS
SELECT id, company_name, country, website, billboards_summary, status, revenue_share_pct, created_at
FROM public.ad_partners
WHERE status = 'approved';

GRANT SELECT ON public.public_ad_partners TO anon, authenticated;

-- 2) Lock down SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.credit_pi_balance(text, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_pi_balance(text, text, numeric) TO service_role;

REVOKE EXECUTE ON FUNCTION public.purchase_ad_campaign(text, text, text, text, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_ad_campaign(text, text, text, text, integer, numeric) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
