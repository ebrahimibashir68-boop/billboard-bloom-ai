CREATE OR REPLACE FUNCTION public.guard_ad_partner_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.revenue_share_pct := DEFAULT_REVENUE_SHARE();
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.revenue_share_pct := OLD.revenue_share_pct;
  NEW.payout_wallet_address := OLD.payout_wallet_address;
  NEW.owner_user_id := OLD.owner_user_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.default_revenue_share()
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 70::numeric $$;

CREATE OR REPLACE FUNCTION public.guard_ad_partner_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.revenue_share_pct := OLD.revenue_share_pct;
  NEW.payout_wallet_address := OLD.payout_wallet_address;
  NEW.owner_user_id := OLD.owner_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ad_partner_fields ON public.ad_partners;
CREATE TRIGGER trg_guard_ad_partner_fields
BEFORE INSERT OR UPDATE ON public.ad_partners
FOR EACH ROW EXECUTE FUNCTION public.guard_ad_partner_privileged_fields();