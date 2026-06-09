CREATE OR REPLACE FUNCTION public.credit_pi_balance(
  p_pi_uid text,
  p_pi_username text,
  p_amount numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  INSERT INTO public.pi_balances (pi_uid, pi_username, balance)
  VALUES (p_pi_uid, p_pi_username, p_amount)
  ON CONFLICT (pi_uid) DO UPDATE
    SET balance = public.pi_balances.balance + EXCLUDED.balance,
        pi_username = EXCLUDED.pi_username,
        updated_at = now()
  RETURNING balance INTO v_balance;

  RETURN v_balance;
END;
$$;