
CREATE TABLE public.intelligence_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dedup_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  snooze_until TIMESTAMPTZ,
  fired_count INTEGER NOT NULL DEFAULT 1,
  last_fired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedup_key)
);

CREATE INDEX idx_intel_alerts_user_active ON public.intelligence_alerts (user_id, acknowledged_at, dismissed_at, scheduled_for DESC);
CREATE INDEX idx_intel_alerts_user_kind ON public.intelligence_alerts (user_id, kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_alerts TO authenticated;
GRANT ALL ON public.intelligence_alerts TO service_role;

ALTER TABLE public.intelligence_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own alerts"
  ON public.intelligence_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_intel_alerts_updated_at
  BEFORE UPDATE ON public.intelligence_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
