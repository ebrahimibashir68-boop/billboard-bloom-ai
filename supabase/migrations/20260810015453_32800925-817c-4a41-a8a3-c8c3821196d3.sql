REVOKE EXECUTE ON FUNCTION public.pay_booking_invoice_with_pi(text, uuid, text, text, numeric) FROM authenticated;

-- Verify only service_role retains execute
GRANT EXECUTE ON FUNCTION public.pay_booking_invoice_with_pi(text, uuid, text, text, numeric) TO service_role;