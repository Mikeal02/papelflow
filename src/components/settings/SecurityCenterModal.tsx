import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldAlert, Gauge, KeyRound, Globe2, RefreshCw,
  Loader2, Fingerprint, Ban, Activity,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SecurityEvent {
  id: string;
  kind: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const SEVERITY_ORDER: SecurityEvent['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];

const SEVERITY_STYLE: Record<SecurityEvent['severity'], string> = {
  critical: 'text-expense border-expense/40 bg-expense/10',
  high: 'text-expense border-expense/30 bg-expense/5',
  medium: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  low: 'text-primary border-primary/30 bg-primary/5',
  info: 'text-muted-foreground border-border bg-muted/30',
};

const KIND_META: Record<string, { label: string; icon: typeof ShieldCheck; hint: string }> = {
  rate_limit_exceeded: {
    label: 'Rate limit reached',
    icon: Gauge,
    hint: 'A sensitive operation was called faster than the allowed rate and was throttled.',
  },
  auth_rejected: {
    label: 'Rejected credential',
    icon: KeyRound,
    hint: 'A request arrived with a missing, expired or malformed session token.',
  },
  anonymous_session_blocked: {
    label: 'Anonymous session blocked',
    icon: Ban,
    hint: 'A guest session tried to reach an operation that requires a real account.',
  },
  new_geo_signin: {
    label: 'Sign-in from a new country',
    icon: Globe2,
    hint: 'Your account was accessed from a country different to your previous sign-in.',
  },
};

function metaFor(kind: string) {
  return (
    KIND_META[kind] ?? {
      label: kind.replace(/_/g, ' '),
      icon: Activity,
      hint: 'Recorded by the server-side security monitor.',
    }
  );
}

export function SecurityCenterModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SecurityEvent['severity'] | 'all'>('all');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('security_events')
      .select('id, kind, severity, source, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setEvents((data as SecurityEvent[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.severity] = (c[e.severity] ?? 0) + 1;
    return c;
  }, [events]);

  const filtered = useMemo(
    () => (severityFilter === 'all' ? events : events.filter((e) => e.severity === severityFilter)),
    [events, severityFilter],
  );

  const posture = useMemo(() => {
    const bad = (counts.critical ?? 0) + (counts.high ?? 0);
    const warn = counts.medium ?? 0;
    if (bad > 0) return { label: 'Action recommended', tone: 'text-expense', icon: ShieldAlert };
    if (warn > 0) return { label: 'Monitoring', tone: 'text-amber-400', icon: ShieldAlert };
    return { label: 'All clear', tone: 'text-income', icon: ShieldCheck };
  }, [counts]);

  const PostureIcon = posture.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-income/20 to-income/5">
              <Fingerprint className="h-4.5 w-4.5 text-income" />
            </span>
            Security Center
          </DialogTitle>
          <DialogDescription>
            Append-only, server-written record of sensitive activity on your account. These entries
            cannot be edited or deleted from the app.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 flex flex-wrap items-center gap-2">
          <div className={cn('flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm font-medium', posture.tone)}>
            <PostureIcon className="h-4 w-4" />
            {posture.label}
          </div>

          <Button
            size="sm"
            variant={severityFilter === 'all' ? 'secondary' : 'outline'}
            className="h-9"
            onClick={() => setSeverityFilter('all')}
          >
            All <span className="ml-1.5 tabular-nums text-muted-foreground">{events.length}</span>
          </Button>

          {SEVERITY_ORDER.filter((s) => counts[s]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={severityFilter === s ? 'secondary' : 'outline'}
              className="h-9 capitalize"
              onClick={() => setSeverityFilter(s)}
            >
              {s} <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[s]}</span>
            </Button>
          ))}

          <Button size="sm" variant="ghost" className="h-9 ml-auto gap-1.5" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>

        <Separator />

        <ScrollArea className="max-h-[52vh]">
          <div className="p-4 space-y-2">
            {loading && events.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading security log…
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <ShieldCheck className="h-8 w-8 text-income" />
                <p className="text-sm font-medium">Nothing to report</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  No throttling, rejected credentials or unusual sign-ins have been recorded for
                  your account.
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {filtered.map((e, i) => {
                const meta = metaFor(e.kind);
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.2), duration: 0.2 }}
                    className="rounded-xl border border-border/60 bg-card/50 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium capitalize">{meta.label}</p>
                          <Badge variant="outline" className={cn('text-[10px] capitalize', SEVERITY_STYLE[e.severity])}>
                            {e.severity}
                          </Badge>
                          {e.source && (
                            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono">
                              {e.source}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{meta.hint}</p>
                        {e.detail && Object.keys(e.detail).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(e.detail).slice(0, 5).map(([k, v]) => (
                              <span
                                key={k}
                                className="rounded-md border border-border/50 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                              >
                                {k}: {String(v ?? '—').slice(0, 24)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-[10px] tabular-nums text-muted-foreground/70">
                          {format(new Date(e.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
