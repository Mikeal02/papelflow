import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, Repeat, PieChart, CalendarClock, Heart, TrendingDown, Target,
  X, Clock, ChevronRight, Sparkles, Zap, ShieldCheck,
} from 'lucide-react';
import { useActionCenterUI } from '@/contexts/ActionCenterContext';
import { useActionCenter } from '@/hooks/useActionCenter';
import { dismissAction, snoozeAction, type PriorityAction, type ActionCategory, type ActionSeverity } from '@/lib/intelligence/actions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCreateSubscription } from '@/hooks/useSubscriptions';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const ICONS: Record<ActionCategory, any> = {
  anomaly: AlertTriangle,
  subscription: Repeat,
  budget: PieChart,
  bill: CalendarClock,
  health: Heart,
  forecast: TrendingDown,
  goal: Target,
};

const SEV_TONE: Record<ActionSeverity, { dot: string; label: string; ring: string }> = {
  critical: { dot: 'bg-destructive', label: 'text-destructive', ring: 'ring-destructive/30' },
  high:     { dot: 'bg-warning',     label: 'text-warning',     ring: 'ring-warning/30' },
  medium:   { dot: 'bg-primary',     label: 'text-primary',     ring: 'ring-primary/30' },
  low:      { dot: 'bg-muted-foreground', label: 'text-muted-foreground', ring: 'ring-border' },
};

const FILTERS: { id: 'all' | ActionSeverity | ActionCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'anomaly', label: 'Anomalies' },
  { id: 'subscription', label: 'Recurring' },
  { id: 'budget', label: 'Budgets' },
  { id: 'bill', label: 'Bills' },
];

export function ActionCenter() {
  const { open, setOpen } = useActionCenterUI();
  const { actions, counts, total } = useActionCenter();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const createSub = useCreateSubscription();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<typeof FILTERS[number]['id']>('all');

  const filtered = actions.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'critical' || filter === 'high') return a.severity === filter;
    return a.category === filter;
  });

  const handleResolve = async (a: PriorityAction) => {
    if (a.cta.intent === 'create_subscription' && a.cta.payload) {
      await createSub.mutateAsync({
        name: a.cta.payload.name,
        amount: a.cta.payload.amount,
        next_due: a.cta.payload.next_due,
        frequency: a.cta.payload.frequency,
      });
      dismissAction(a.id);
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Subscription created', description: `Now tracking ${a.cta.payload.name}` });
    } else if (a.cta.route) {
      navigate(a.cta.route);
      setOpen(false);
    }
  };

  const handleDismiss = (a: PriorityAction) => {
    dismissAction(a.id);
    qc.invalidateQueries(); // re-derive
    toast({ title: 'Dismissed', description: 'Hidden for 30 days.' });
  };

  const handleSnooze = (a: PriorityAction) => {
    snoozeAction(a.id, 24);
    qc.invalidateQueries();
    toast({ title: 'Snoozed', description: 'Will reappear in 24h.' });
  };

  const potentialSave = actions
    .filter(a => a.category === 'subscription' || a.category === 'budget')
    .reduce((s, a) => s + (a.impact && a.impact > 0 ? a.impact : 0), 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/15 flex items-center justify-center border border-border/30">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-bold tracking-tight">Action Center</SheetTitle>
              <SheetDescription className="text-[11px]">
                {total === 0 ? 'You are all caught up ✨' : `${total} prioritized insights · ⌘J`}
              </SheetDescription>
            </div>
          </div>

          {total > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              <Stat label="Critical" value={counts.critical} tone="text-destructive" />
              <Stat label="High" value={counts.high} tone="text-warning" />
              <Stat label="Medium" value={counts.medium} tone="text-primary" />
              <Stat label="Low" value={counts.low} tone="text-muted-foreground" />
            </div>
          )}

          {potentialSave > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-success/8 border border-success/20 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-success shrink-0" />
              <p className="text-[11px] text-foreground">
                <span className="font-semibold tabular-nums">{formatCurrency(potentialSave)}</span>
                <span className="text-muted-foreground"> potential annual visibility</span>
              </p>
            </div>
          )}

          <div className="flex gap-1.5 mt-3 overflow-x-auto -mx-1 px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
                  filter === f.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 text-muted-foreground hover:text-foreground border-border/40'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {filtered.length === 0 ? (
              <EmptyState filter={filter} totalAll={total} />
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((a, i) => (
                  <ActionCard
                    key={a.id}
                    action={a}
                    index={i}
                    onResolve={handleResolve}
                    onDismiss={handleDismiss}
                    onSnooze={handleSnooze}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/40 px-4 py-2.5 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-success" />
            Computed locally · no data leaves your device
          </p>
          <kbd className="text-[9px] bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">⌘J</kbd>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border/30 px-2 py-1.5 text-center">
      <div className={cn('text-base font-bold tabular-nums leading-none', tone)}>{value}</div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function EmptyState({ filter, totalAll }: { filter: string; totalAll: number }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
        <Sparkles className="h-5 w-5 text-success" />
      </div>
      <p className="text-sm font-semibold mb-1">
        {totalAll === 0 ? 'Nothing needs your attention' : `No ${filter} items`}
      </p>
      <p className="text-[11px] text-muted-foreground max-w-[240px] mx-auto">
        {totalAll === 0
          ? 'Anomaly detection, recurring trackers, and budget watchers will surface insights here as they appear.'
          : 'Try a different filter to see other prioritized actions.'}
      </p>
    </div>
  );
}

function ActionCard({
  action, index, onResolve, onDismiss, onSnooze, formatCurrency,
}: {
  action: PriorityAction;
  index: number;
  onResolve: (a: PriorityAction) => void;
  onDismiss: (a: PriorityAction) => void;
  onSnooze: (a: PriorityAction) => void;
  formatCurrency: (n: number) => string;
}) {
  const Icon = ICONS[action.category];
  const tone = SEV_TONE[action.severity];
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
      className={cn(
        'rounded-xl border bg-card/60 hover:bg-card/90 transition-colors overflow-hidden',
        'border-border/40'
      )}
    >
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div className={cn('h-8 w-8 rounded-lg bg-muted/40 ring-1 flex items-center justify-center shrink-0', tone.ring)}>
            <Icon className={cn('h-4 w-4', tone.label)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
              <span className={cn('text-[9px] font-semibold uppercase tracking-wider', tone.label)}>
                {action.severity}
              </span>
              <Badge variant="outline" className="text-[9px] capitalize ml-auto">
                {action.category}
              </Badge>
            </div>
            <h3 className="text-[13px] font-semibold leading-tight truncate">{action.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 line-clamp-2">
              {action.description}
            </p>

            {action.impact !== undefined && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{action.impactLabel || 'Impact'}:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCurrency(Math.abs(action.impact))}
                </span>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-2.5 rounded-lg bg-muted/30 border border-border/30 space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Evidence</p>
                {action.evidence.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{e.label}</span>
                    <span className="font-medium tabular-nums">{e.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1 mt-3">
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 flex-1 gap-1"
            onClick={() => onResolve(action)}
          >
            {action.cta.label}
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] px-2 text-muted-foreground"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? 'Hide' : 'Why?'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={() => onSnooze(action)}
            title="Snooze 24h"
          >
            <Clock className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={() => onDismiss(action)}
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
