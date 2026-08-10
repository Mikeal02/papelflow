-- 1) Durable, shared rate-limit counters (server-only, never exposed via Data API)
CREATE TABLE public.rate_limit_counters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  bucket text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  window_sec integer NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rate_limit_counters_unique UNIQUE (subject, bucket, window_sec, window_start)
);

REVOKE ALL ON public.rate_limit_counters FROM anon, authenticated;
GRANT ALL ON public.rate_limit_counters TO service_role;

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) may touch this table.

CREATE INDEX rate_limit_counters_window_idx ON public.rate_limit_counters (window_start);

CREATE TRIGGER update_rate_limit_counters_updated_at
BEFORE UPDATE ON public.rate_limit_counters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic consume: returns allowed + remaining + retry_after seconds.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_subject text,
  p_bucket text,
  p_limit integer,
  p_window_sec integer
)
RETURNS TABLE (allowed boolean, hits integer, retry_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_hits integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_window_sec IS NULL OR p_window_sec < 1 THEN
    RAISE EXCEPTION 'invalid rate limit parameters';
  END IF;

  -- Fixed window aligned to epoch so all instances agree on boundaries.
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_sec) * p_window_sec);

  INSERT INTO public.rate_limit_counters AS r (subject, bucket, window_start, window_sec, hits)
  VALUES (left(p_subject, 200), left(p_bucket, 100), v_start, p_window_sec, 1)
  ON CONFLICT (subject, bucket, window_sec, window_start)
  DO UPDATE SET hits = r.hits + 1, updated_at = now()
  RETURNING r.hits INTO v_hits;

  RETURN QUERY SELECT
    v_hits <= p_limit,
    v_hits,
    GREATEST(1, CEIL(extract(epoch from (v_start + make_interval(secs => p_window_sec)) - now()))::integer);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.purge_rate_limit_counters()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.rate_limit_counters WHERE window_start < now() - interval '2 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_rate_limit_counters() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_rate_limit_counters() TO service_role;

-- 2) Append-only server-side security event log
CREATE TABLE public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own security events"
ON public.security_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: append-only, written by service_role only.

CREATE INDEX security_events_user_created_idx ON public.security_events (user_id, created_at DESC);
CREATE INDEX security_events_severity_idx ON public.security_events (severity, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_security_event(
  p_user_id uuid,
  p_kind text,
  p_severity text,
  p_source text,
  p_detail jsonb DEFAULT '{}'::jsonb,
  p_ip_hash text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_severity NOT IN ('info','low','medium','high','critical') THEN
    RAISE EXCEPTION 'invalid severity';
  END IF;

  INSERT INTO public.security_events (user_id, kind, severity, source, detail, ip_hash)
  VALUES (p_user_id, left(p_kind, 100), p_severity, left(p_source, 100), COALESCE(p_detail, '{}'::jsonb), left(p_ip_hash, 64))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_security_event(uuid, text, text, text, jsonb, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_security_event(uuid, text, text, text, jsonb, text) TO service_role;