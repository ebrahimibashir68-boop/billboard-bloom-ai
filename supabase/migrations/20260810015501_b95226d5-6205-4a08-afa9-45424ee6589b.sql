REVOKE ALL ON FUNCTION public.pay_booking_invoice_with_pi(text, uuid, text, text, numeric) FROM PUBLIC;

-- Ensure service_role retains execute for backend server functions
GRANT EXECUTE ON FUNCTION public.pay_booking_invoice_with_pi(text, uuid, text, text, numeric) TO service_role;