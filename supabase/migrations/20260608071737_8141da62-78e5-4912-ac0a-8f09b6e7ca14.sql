
REVOKE EXECUTE ON FUNCTION public.purchase_ad_campaign(text, text, text, text, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_ad_campaign(text, text, text, text, integer, numeric) TO service_role;
