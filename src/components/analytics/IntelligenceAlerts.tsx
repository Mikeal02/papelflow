import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, X, Clock, ShieldAlert, Store, Network, TrendingUp,
  AlertTriangle, Zap, RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEliteIntelligence, useIntelligenceAlerts } from '@/hooks/useEliteIntelligence';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const kindMeta: Record<string, { icon: any; label: string }> = {
  anomaly: { icon: ShieldAlert, label: 'Anomaly' },
  merchant_churn: { icon: Store, label: 'Churn risk' },
  merchant_revival: { icon: TrendingUp, label: 'Revival' },
  wallet_concentration: { icon: Network, label: 'Wallet HHI' },
  next_visit: { icon: Clock, label: 'Next visit' },
  high_clv_at_risk: { icon: AlertTriangle, label: 'CLV at risk' },
};

const sevChip: Record<string, string> = {
  critical: 'bg-expense/20 text-expense border-expense/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  medium: 'bg-primary/20 text-primary border-primary/30',
  low: 'bg-muted text-muted-foreground border-border',
};

type Filter = 'all' | 'open' | 'acknowledged' | 'scheduled';

export const IntelligenceAlerts = () => {
  const intel = useEliteIntelligence();
  const { data: alerts = [], isLoading } = useIntelligenceAlerts();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('open');

  const now = Date.now();
  const filtered = useMemo(() => {
    return (alerts as any[]).filter(a => {
      const scheduled = new Date(a.scheduled_for).getTime() > now;
      if (filter === 'all') return true;
      if (filter === 'open') return !a.acknowledged_at && !scheduled;
      if (filter === 'acknowledged') return !!a.acknowledged_at;
      if (filter === 'scheduled') return scheduled;
      return true;
    });
  }, [alerts, filter, now]);

  const counts = useMemo(() => {
    let crit = 0, high = 0, med = 0, low = 0;
    for (const a of alerts as any[]) {
      if (a.acknowledged_at) continue;
      if (a.severity === 'critical') crit++;
      else if (a.severity === 'high') high++;
      else if (a.severity === 'medium') med++;
      else low++;
    }
    return { crit, high, med, low };
  }, [alerts]);

  const ack = async (id: string) => {
    await supabase.from('intelligence_alerts')
      .update({ acknowledged_at: new Date().toISOString() }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['intelligence-alerts'] });
  };
  const dismiss = async (id: string) => {
    await supabase.from('intelligence_alerts')
      .update({ dismissed_at: new Date().toISOString() }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['intelligence-alerts'] });
  };
  const snooze = async (id: string, hours: number) => {
    const until = new Date(Date.now() + hours * 3600000).toISOString();
    await supabase.from('intelligence_alerts')
      .update({ snooze_until: until }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['intelligence-alerts'] });
    toast({ title: `Snoozed for ${hours}h`, duration: 3000 });
  };

  return (
    <Card className="stat-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-border/30 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Intelligence Alerts</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rules engine · {intel.mode} ·{' '}
                {intel.durationMs ? `${intel.durationMs}ms` : 'idle'}
                {intel.diff && intel.diff.added.length > 0 ? ` · +${intel.diff.added.length} new tx` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {counts.crit > 0 && <Badge className={sevChip.critical}>{counts.crit} critical</Badge>}
            {counts.high > 0 && <Badge className={sevChip.high}>{counts.high} high</Badge>}
            {counts.med > 0 && <Badge className={sevChip.medium}>{counts.med} med</Badge>}
            {counts.low > 0 && <Badge className={sevChip.low}>{counts.low} low</Badge>}
          </div>
        </div>

        <Tabs value={filter} onValueChange={v => setFilter(v as Filter)} className="mt-3">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="acknowledged">Acked</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
        {(isLoading || intel.loading) && !filtered.length && (
          <div className="text-sm text-muted-foreground py-8 text-center flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Computing intelligence in background…
          </div>
        )}
        {!intel.loading && !filtered.length && (
          <div className="text-sm text-muted-foreground py-8 text-center">
            <Zap className="h-5 w-5 mx-auto mb-2 opacity-50" />
            No {filter !== 'all' ? filter : ''} alerts. Your finances look healthy.
          </div>
        )}

        <AnimatePresence initial={false}>
          {filtered.map((a: any) => {
            const meta = kindMeta[a.kind] || { icon: Bell, label: a.kind };
            const Icon = meta.icon;
            const sched = new Date(a.scheduled_for);
            const isFuture = sched.getTime() > now;
            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  'rounded-xl border p-3 bg-card/40 backdrop-blur-sm',
                  a.acknowledged_at && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn('text-[10px]', sevChip[a.severity])}>
                        {a.severity}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {meta.label}
                      </span>
                      {a.fired_count > 1 && (
                        <span className="text-[10px] text-muted-foreground">
                          · fired {a.fired_count}×
                        </span>
                      )}
                      {isFuture && (
                        <span className="text-[10px] text-primary inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDistanceToNow(sched, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm mt-1 truncate">{a.title}</div>
                    {a.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {!a.acknowledged_at && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          onClick={() => ack(a.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Acknowledge
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        onClick={() => snooze(a.id, 24)}>
                        <Clock className="h-3 w-3 mr-1" /> 24h
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        onClick={() => snooze(a.id, 24 * 7)}>
                        1w
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        onClick={() => dismiss(a.id)}>
                        <X className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
