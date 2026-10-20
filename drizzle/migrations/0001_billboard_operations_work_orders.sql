CREATE TABLE public.billboard_work_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pi_uid text NOT NULL, pi_username text NOT NULL,
 category text NOT NULL CHECK (category IN ('site_rights','engineering','logistics','maintenance','compliance','makegood','decommission')),
 title text NOT NULL, site_name text NOT NULL, market text NOT NULL, reference text,
 supplier text, due_on date NOT NULL, budget_pi numeric(16,7) NOT NULL DEFAULT 0 CHECK (budget_pi >= 0),
 description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','in_progress','evidence_submitted','completed','cancelled')),
 version integer NOT NULL DEFAULT 1, ledger_hash text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.billboard_work_orders TO service_role;
ALTER TABLE public.billboard_work_orders ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.billboard_work_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), work_order_id uuid NOT NULL REFERENCES public.billboard_work_orders(id),
 pi_uid text NOT NULL, event_type text NOT NULL, from_status text, to_status text NOT NULL,
 note text NOT NULL DEFAULT '', evidence_url text, ledger_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.billboard_work_events TO service_role;
ALTER TABLE public.billboard_work_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX billboard_work_orders_owner_idx ON public.billboard_work_orders(pi_uid, created_at DESC);
CREATE INDEX billboard_work_events_order_idx ON public.billboard_work_events(work_order_id, created_at);
COMMENT ON TABLE public.billboard_work_orders IS 'Pi-authenticated operational dossiers. Budget is an estimate, not a payment or escrow. Server-only access.';
COMMENT ON TABLE public.billboard_work_events IS 'Append-only operational history linked to the application hash-chain; does not assert independent verification or on-chain deployment.';
CREATE OR REPLACE FUNCTION public.create_billboard_work_order(p_uid text, p_username text, p_details jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_hash text;
BEGIN
 INSERT INTO public.billboard_work_orders(pi_uid, pi_username, category, title, site_name, market, reference, supplier, due_on, budget_pi, description)
 VALUES (p_uid, p_username, p_details->>'category', p_details->>'title', p_details->>'site_name', p_details->>'market', p_details->>'reference', p_details->>'supplier', (p_details->>'due_on')::date, COALESCE((p_details->>'budget_pi')::numeric,0), COALESCE(p_details->>'description','')) RETURNING id INTO v_id;
 v_hash := public.ledger_append('work_order_created', 'billboard_work_orders', v_id, jsonb_build_object('owner',p_uid,'details',p_details,'status','draft'));
 IF v_hash IS NULL THEN RAISE EXCEPTION 'Ledger unavailable'; END IF;
 UPDATE public.billboard_work_orders SET ledger_hash=v_hash WHERE id=v_id;
 INSERT INTO public.billboard_work_events(work_order_id,pi_uid,event_type,to_status,note,ledger_hash) VALUES(v_id,p_uid,'created','draft','Work order created',v_hash);
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_billboard_work_order(text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_billboard_work_order(text,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.advance_billboard_work_order(p_uid text,p_id uuid,p_version integer,p_status text,p_note text,p_evidence_url text DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.billboard_work_orders; v_hash text; v_event uuid := gen_random_uuid();
BEGIN
 SELECT * INTO v_row FROM public.billboard_work_orders WHERE id=p_id AND pi_uid=p_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Work order not found'; END IF;
 IF v_row.version<>p_version THEN RAISE EXCEPTION 'Record changed; refresh before updating'; END IF;
 IF NOT ((v_row.status='draft' AND p_status IN ('submitted','cancelled')) OR (v_row.status='submitted' AND p_status IN ('in_progress','cancelled')) OR (v_row.status='in_progress' AND p_status IN ('evidence_submitted','cancelled')) OR (v_row.status='evidence_submitted' AND p_status IN ('completed','in_progress','cancelled'))) THEN RAISE EXCEPTION 'Invalid status transition'; END IF;
 IF length(trim(COALESCE(p_note,'')))=0 OR length(p_note)>2000 THEN RAISE EXCEPTION 'An event note is required'; END IF;
 IF p_status='evidence_submitted' AND (p_evidence_url IS NULL OR p_evidence_url !~ '^https://') THEN RAISE EXCEPTION 'HTTPS evidence is required'; END IF;
 v_hash := public.ledger_append('work_order_transition','billboard_work_orders',p_id,jsonb_build_object('event_id',v_event,'owner',p_uid,'from',v_row.status,'to',p_status,'note',p_note,'evidence_url',p_evidence_url,'version',p_version+1));
 IF v_hash IS NULL THEN RAISE EXCEPTION 'Ledger unavailable'; END IF;
 INSERT INTO public.billboard_work_events(id,work_order_id,pi_uid,event_type,from_status,to_status,note,evidence_url,ledger_hash) VALUES(v_event,p_id,p_uid,'transition',v_row.status,p_status,p_note,p_evidence_url,v_hash);
 UPDATE public.billboard_work_orders SET status=p_status,version=version+1,ledger_hash=v_hash,updated_at=now() WHERE id=p_id;
 RETURN p_version+1;
END; $$;
REVOKE ALL ON FUNCTION public.advance_billboard_work_order(text,uuid,integer,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_billboard_work_order(text,uuid,integer,text,text,text) TO service_role;