DROP FUNCTION IF EXISTS public.default_revenue_share();
REVOKE ALL ON FUNCTION public.guard_ad_partner_privileged_fields() FROM PUBLIC, anon, authenticated;