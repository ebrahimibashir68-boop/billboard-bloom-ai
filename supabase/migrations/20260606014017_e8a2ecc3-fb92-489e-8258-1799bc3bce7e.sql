
CREATE TABLE public.pi_balances (
  pi_uid TEXT PRIMARY KEY,
  pi_username TEXT NOT NULL,
  balance NUMERIC(20, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pi_payments (
  payment_id TEXT PRIMARY KEY,
  pi_uid TEXT NOT NULL,
  txid TEXT NOT NULL,
  amount NUMERIC(20, 4) NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pi_payments_pi_uid_idx ON public.pi_payments (pi_uid);

-- Service role only — these tables are only ever touched by the verified
-- server routes that authenticate the caller via the Pi Network access token.
GRANT ALL ON public.pi_balances TO service_role;
GRANT ALL ON public.pi_payments TO service_role;

ALTER TABLE public.pi_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_payments ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => default deny. The browser cannot read
-- or write these tables directly; only the server routes (service_role) can.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pi_balances_updated_at
BEFORE UPDATE ON public.pi_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
