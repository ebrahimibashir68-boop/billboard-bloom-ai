CREATE OR REPLACE FUNCTION public.pay_booking_invoice(p_pi_uid text, p_invoice_id uuid)
 RETURNS TABLE(new_balance numeric, plays_created integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv public.invoices%ROWTYPE; v_bk public.bookings%ROWTYPE;
  v_bal numeric; v_loc public.billboard_locations%ROWTYPE;
  v_plays integer := 0; v_imp integer; v_per_hr integer;
  v_t timestamptz; v_end timestamptz; i integer;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_inv.id IS NULL OR v_inv.advertiser_pi_uid <> p_pi_uid THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_inv.status = 'paid' THEN RAISE EXCEPTION 'already_paid'; END IF;
  IF v_inv.booking_id IS NULL THEN RAISE EXCEPTION 'not_a_booking_invoice'; END IF;
  SELECT * INTO v_bk FROM public.bookings WHERE id = v_inv.booking_id FOR UPDATE;
  IF v_bk.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  SELECT balance INTO v_bal FROM public.pi_balances WHERE pi_uid = p_pi_uid FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_inv.total_pi THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  UPDATE public.pi_balances SET balance = balance - v_inv.total_pi, updated_at = now()
    WHERE pi_uid = p_pi_uid RETURNING balance INTO v_bal;

  -- Settled from the advertiser's Pi balance (funded by real Pi deposits).
  -- No blockchain txid exists for an internal balance settlement, so we
  -- deliberately leave pi_txid NULL instead of fabricating one.
  UPDATE public.invoices SET status='paid', paid_at=now(), pi_txid = NULL
    WHERE id = p_invoice_id;
  UPDATE public.bookings SET status='running' WHERE id = v_bk.id;

  PERFORM public.ledger_append('settlement', 'invoices', p_invoice_id,
    jsonb_build_object('invoice_number', v_inv.invoice_number, 'total_pi', v_inv.total_pi,
      'settlement_source', 'pi_balance', 'partner_id', v_inv.partner_id));

  SELECT * INTO v_loc FROM public.billboard_locations WHERE id = v_bk.location_id;
  v_per_hr := 4;
  v_imp := GREATEST(1, floor(v_loc.daily_impressions::numeric / 24 / v_per_hr)::int);
  v_t := v_bk.starts_at; v_end := v_bk.starts_at + (v_bk.hours || ' hours')::interval;
  WHILE v_t < v_end LOOP
    FOR i IN 1..v_per_hr LOOP
      INSERT INTO public.plays(booking_id, location_id, played_at, impressions)
      VALUES (v_bk.id, v_bk.location_id,
              v_t + make_interval(mins => (60/v_per_hr)*(i-1)),
              v_imp);
      v_plays := v_plays + 1;
    END LOOP;
    v_t := v_t + interval '1 hour';
  END LOOP;

  new_balance := v_bal; plays_created := v_plays; RETURN NEXT;
END;
$function$;