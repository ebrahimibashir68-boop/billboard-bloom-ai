-- 1. Ledger entries: remove public read access
DROP POLICY IF EXISTS "Public ledger read" ON public.ledger_entries;
REVOKE SELECT ON public.ledger_entries FROM anon, authenticated;
GRANT ALL ON public.ledger_entries TO service_role;

-- 2. Revoke EXECUTE on SECURITY DEFINER / internal functions from client roles
REVOKE ALL ON FUNCTION public.ledger_append(text, text, uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.screen_playlist(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_ledger_integrity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_ledger_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_ledger_invoice_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_ledger_play() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ledger_append(text, text, uuid, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.screen_playlist(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_ledger_integrity() TO service_role;