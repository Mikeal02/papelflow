
CREATE TABLE public.login_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sign_in','sign_out','token_refresh','password_change','failed_attempt')),
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  session_id TEXT,
  is_suspicious BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX login_events_user_created_idx ON public.login_events (user_id, created_at DESC);
CREATE INDEX login_events_session_idx ON public.login_events (user_id, session_id);

GRANT SELECT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login events"
  ON public.login_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts only via service_role (edge function) to prevent client tampering.
CREATE POLICY "Users can delete their own login events"
  ON public.login_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
