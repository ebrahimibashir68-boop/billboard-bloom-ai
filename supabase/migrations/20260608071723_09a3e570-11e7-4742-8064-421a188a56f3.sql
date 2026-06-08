
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid text NOT NULL,
  pi_username text NOT NULL,
  title text NOT NULL,
  placement text NOT NULL,
  duration_days integer NOT NULL,
  cost_pi numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ad_campaigns TO service_role;

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER ad_campaigns_updated_at
BEFORE UPDATE ON public.ad_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.purchase_ad_campaign(
  p_pi_uid text,
  p_pi_username text,
  p_title text,
  p_placement text,
  p_duration_days integer,
  p_cost_pi numeric
) RETURNS TABLE (
  campaign_id uuid,
  new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_id uuid;
BEGIN
  IF p_cost_pi <= 0 OR p_duration_days <= 0 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  SELECT balance INTO v_balance
  FROM public.pi_balances
  WHERE pi_uid = p_pi_uid
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_cost_pi THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.pi_balances
  SET balance = balance - p_cost_pi,
      updated_at = now()
  WHERE pi_uid = p_pi_uid
  RETURNING balance INTO v_balance;

  INSERT INTO public.ad_campaigns (
    pi_uid, pi_username, title, placement, duration_days, cost_pi, ends_at
  ) VALUES (
    p_pi_uid, p_pi_username, p_title, p_placement, p_duration_days, p_cost_pi,
    now() + (p_duration_days || ' days')::interval
  ) RETURNING id INTO v_id;

  campaign_id := v_id;
  new_balance := v_balance;
  RETURN NEXT;
END;
$$;
