REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_rate_limit_counters() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_security_event(uuid, text, text, text, jsonb, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_rate_limit_counters() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_security_event(uuid, text, text, text, jsonb, text) TO service_role;