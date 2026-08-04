-- Defence in depth: RLS already restricts every row to auth.uid(), but the
-- anon role still held table-level privileges. Remove them so an unauthenticated
-- request is rejected before RLS is even evaluated.
REVOKE ALL ON public.accounts FROM anon;
REVOKE ALL ON public.budgets FROM anon;
REVOKE ALL ON public.categories FROM anon;
REVOKE ALL ON public.goals FROM anon;
REVOKE ALL ON public.intelligence_alerts FROM anon;
REVOKE ALL ON public.login_events FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE ALL ON public.transactions FROM anon;

-- login_events is written only by the server (service role); make sure no
-- client role can insert or modify forged security-audit entries.
REVOKE INSERT, UPDATE ON public.login_events FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_alerts TO authenticated;
GRANT SELECT, DELETE ON public.login_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;

GRANT ALL ON public.accounts, public.budgets, public.categories, public.goals,
  public.intelligence_alerts, public.login_events, public.profiles,
  public.subscriptions, public.transactions TO service_role;
