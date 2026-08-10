ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS pi_payment_id text,
  ADD COLUMN IF NOT EXISTS pi_txid text;

CREATE OR REPLACE FUNCTION public.purchase_ad_campaign_with_pi(
  p_pi_uid text,
  p_pi_username text,
  p_title text,
  p_placement text,
  p_duration_days integer,
  p_cost_pi numeric,
  p_payment_id text,
  p_txid text
) RETURNS TABLE (
  campaign_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_cost_pi <= 0 OR p_duration_days <= 0 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  -- Idempotency: if this payment already funded a campaign, return it.
  SELECT id INTO v_id
  FROM public.ad_campaigns
  WHERE pi_payment_id = p_payment_id
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.ad_campaigns (
      pi_uid, pi_username, title, placement, duration_days, cost_pi,
      status, starts_at, ends_at, pi_payment_id, pi_txid
    ) VALUES (
      p_pi_uid, p_pi_username, p_title, p_placement, p_duration_days, p_cost_pi,
      'active', now(), now() + (p_duration_days || ' days')::interval,
      p_payment_id, p_txid
    ) RETURNING id INTO v_id;

    PERFORM public.ledger_append('campaign_purchase', 'ad_campaigns', v_id,
      jsonb_build_object(
        'title', p_title,
        'placement', p_placement,
        'cost_pi', p_cost_pi,
        'payment_id', p_payment_id,
        'txid', p_txid
      ));
  END IF;

  campaign_id := v_id;
  RETURN NEXT;
END;
$$;

-- Secure the function: only backend service_role may invoke it directly.
REVOKE ALL ON FUNCTION public.purchase_ad_campaign_with_pi(text, text, text, text, integer, numeric, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purchase_ad_campaign_with_pi(text, text, text, text, integer, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purchase_ad_campaign_with_pi(text, text, text, text, integer, numeric, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_ad_campaign_with_pi(text, text, text, text, integer, numeric, text, text) TO service_role;