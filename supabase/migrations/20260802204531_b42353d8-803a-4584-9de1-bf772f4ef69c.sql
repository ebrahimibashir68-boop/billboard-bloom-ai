DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ad_campaigns','ad_contracts','ad_placements','ad_plays',
    'brand_presets','creatives','ledger_entries','pi_balances','pi_payments'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      'no_direct_client_access_' || t, t
    );
  END LOOP;
END $$;