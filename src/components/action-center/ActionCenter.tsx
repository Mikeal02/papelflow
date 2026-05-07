import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle, Repeat, PieChart, CalendarClock, Heart, TrendingDown, Target,
  X, Clock, ChevronRight, Sparkles, Zap, ShieldCheck, Search, Pin, PinOff,
  History, ArrowUpDown, Layers, MoreHorizontal, Undo2, CheckCheck, ListChecks,
  PiggyBank, Wallet, Filter, ChevronDown, Activity, Gauge,
} from 'lucide-react';
import { useActionCenterUI } from '@/contexts/ActionCenterContext';
import { useActionCenter } from '@/hooks/useActionCenter';
import {
  dismissAction, snoozeAction, undoDismiss, togglePin, readPinned,
  resolveAction, sortActions, searchActions, groupActions, readHistory,
  type PriorityAction, type ActionCategory, type ActionSeverity,
  type SortKey, type GroupKey, type ActionHistoryEntry,
} from '@/lib/intelligence/actions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCreateSubscription } from '@/hooks/useSubscriptions';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

const ICONS: Record<ActionCategory, any> = {
  anomaly: AlertTriangle,
  subscription: Repeat,
  budget: PieChart,
  bill: CalendarClock,
  health: Heart,
  forecast: TrendingDown,
  goal: Target,
  savings: PiggyBank,
  cash: Wallet,
};

const SEV_TONE: Record<ActionSeverity, { dot: string; label: string; ring: string; bar: string }> = {
  critical: { dot: 'bg-destructive', label: 'text-destructive', ring: 'ring-destructive/30', bar: 'bg-destructive' },
  high:     { dot: 'bg-warning',     label: 'text-warning',     ring: 'ring-warning/30',     bar: 'bg-warning' },
  medium:   { dot: 'bg-primary',     label: 'text-primary',     ring: 'ring-primary/30',     bar: 'bg-primary' },
  low:      { dot: 'bg-muted-foreground', label: 'text-muted-foreground', ring: 'ring-border', bar: 'bg-muted-foreground' },
};

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'priority', label: 'Priority' },
  { id: 'impact', label: 'Impact ($)' },
  { id: 'urgency', label: 'Urgency' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'recent', label: 'Most recent' },
];

const GROUPS: { id: GroupKey; label: string }[] = [
  { id: 'none', label: 'No grouping' },
  { id: 'severity', label: 'By severity' },
  { id: 'category', label: 'By category' },
];

export function ActionCenter() {
  const { open, setOpen } = useActionCenterUI();
  const { actions, counts, byCategory, totalMinutes, totalImpact, total } = useActionCenter();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const createSub = useCreateSubscription();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'inbox' | 'pinned' | 'history'>('inbox');
  const [filter, setFilter] = useState<'all' | ActionSeverity | ActionCategory>('all');
  const [sort, setSort] = useState<SortKey>('priority');
  const [group, setGroup] = useState<GroupKey>('none');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pinnedSet, setPinnedSet] = useState<Set<string>>(() => readPinned());
  const [history, setHistory] = useState<ActionHistoryEntry[]>([]);
  const [lastDismissed, setLastDismissed] = useState<PriorityAction | null>(null);
  const [focusIdx, setFocusIdx] = useState<number>(-1);

  // refresh ephemeral state when sheet opens
  useEffect(() => {
    if (open) {
      setPinnedSet(readPinned());
      setHistory(readHistory().slice().reverse());
      setSelected(new Set());
      setFocusIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // keyboard nav inside the sheet
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return; // sheet handles
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const visible = useMemo(() => {
    let list = actions;
    if (tab === 'pinned') list = list.filter(a => pinnedSet.has(a.id));
    if (filter !== 'all') {
      list = list.filter(a =>
        ['critical', 'high', 'medium', 'low'].includes(filter)
          ? a.severity === filter
          : a.category === filter,
      );
    }
    list = searchActions(list, search);
    list = sortActions(list, sort);
    return list;
  }, [actions, tab, filter, search, sort, pinnedSet]);

  const groups = useMemo(() => groupActions(visible, group), [visible, group]);

  const refresh = () => qc.invalidateQueries();

  const handleResolve = async (a: PriorityAction) => {
    if (a.cta.intent === 'create_subscription' && a.cta.payload) {
      await createSub.mutateAsync({
        name: a.cta.payload.name,
        amount: a.cta.payload.amount,
        next_due: a.cta.payload.next_due,
        frequency: a.cta.payload.frequency,
      });
      resolveAction(a);
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Subscription created', description: `Now tracking ${a.cta.payload.name}` });
    } else if (a.cta.route) {
      resolveAction(a);
      navigate(a.cta.route);
      setOpen(false);
    }
    refresh();
  };

  const handleDismiss = (a: PriorityAction) => {
    dismissAction(a.id, a);
    setLastDismissed(a);
    refresh();
    toast({
      title: 'Dismissed',
      description: 'Hidden for 30 days.',
      action: (
        <Button size="sm" variant="ghost" onClick={() => { undoDismiss(a.id); setLastDismissed(null); refresh(); }}>
          <Undo2 className="h-3 w-3 mr-1" /> Undo
        </Button>
      ) as any,
    });
  };

  const handleSnooze = (a: PriorityAction, hours = 24) => {
    snoozeAction(a.id, hours, a);
    refresh();
    toast({ title: `Snoozed ${hours}h`, description: 'Will reappear automatically.' });
  };

  const handleTogglePin = (id: string) => {
    togglePin(id);
    setPinnedSet(readPinned());
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const bulkDismiss = () => {
    visible.filter(a => selected.has(a.id)).forEach(a => dismissAction(a.id, a));
    toast({ title: `Dismissed ${selected.size} items` });
    setSelected(new Set());
    refresh();
  };

  const bulkSnooze = () => {
    visible.filter(a => selected.has(a.id)).forEach(a => snoozeAction(a.id, 24, a));
    toast({ title: `Snoozed ${selected.size} items` });
    setSelected(new Set());
    refresh();
  };

  type FilterId = 'all' | ActionSeverity | ActionCategory;
  const filterOptions: { id: FilterId; label: string; n?: number }[] = ([
    { id: 'all', label: 'All', n: total },
    { id: 'critical', label: 'Critical', n: counts.critical },
    { id: 'high', label: 'High', n: counts.high },
    { id: 'anomaly', label: 'Anomalies', n: byCategory.anomaly },
    { id: 'subscription', label: 'Recurring', n: byCategory.subscription },
    { id: 'budget', label: 'Budgets', n: byCategory.budget },
    { id: 'bill', label: 'Bills', n: byCategory.bill },
    { id: 'savings', label: 'Savings', n: byCategory.savings },
    { id: 'cash', label: 'Cash', n: byCategory.cash },
    { id: 'goal', label: 'Goals', n: byCategory.goal },
    { id: 'health', label: 'Health', n: byCategory.health },
    { id: 'forecast', label: 'Forecast', n: byCategory.forecast },
  ] as { id: FilterId; label: string; n?: number }[]).filter(f => f.id === 'all' || (f.n ?? 0) > 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* HEADER */}
        <SheetHeader className="relative px-5 pt-5 pb-3 border-b border-border/40 space-y-3 mesh-bg overflow-hidden">
          {/* Decorative orbs */}
          <motion.div
            aria-hidden
            className="absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl bg-primary/15 pointer-events-none"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-xl conic-ring bg-card flex items-center justify-center shadow-sm">
              <Zap className="h-5 w-5 text-primary relative z-10" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-bold tracking-tight">
                <span className="holo-ticker">Action Center</span>
              </SheetTitle>
              <SheetDescription className="text-[11px] eyebrow-bar">
                {total === 0 ? 'You are all caught up' : `${total} prioritized insights · ⌘J`}
              </SheetDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide">Density</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/analytics')}>
                  <Activity className="h-3.5 w-3.5 mr-2" /> Open intelligence
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSearch(''); setFilter('all'); setSort('priority'); setGroup('none'); }}>
                  <ListChecks className="h-3.5 w-3.5 mr-2" /> Reset view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* SUMMARY TILES */}
          {total > 0 && (
            <div className="relative grid grid-cols-4 gap-2">
              <Stat label="Critical" value={counts.critical} tone="text-destructive" accent="--destructive" />
              <Stat label="High" value={counts.high} tone="text-warning" accent="--warning" />
              <Stat label="Save / yr" value={Math.round(totalImpact)} tone="text-success" accent="--success" prefix="$" />
              <Stat label="Time" value={totalMinutes} tone="text-foreground" accent="--primary" suffix="m" />
            </div>
          )}

          {/* TABS */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-3 h-8">
              <TabsTrigger value="inbox" className="text-[11px] gap-1">
                <Zap className="h-3 w-3" /> Inbox
                {total > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">{total}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="pinned" className="text-[11px] gap-1">
                <Pin className="h-3 w-3" /> Pinned
                {pinnedSet.size > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">{pinnedSet.size}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-[11px] gap-1">
                <History className="h-3 w-3" /> History
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {tab !== 'history' && (
            <>
              {/* SEARCH + SORT + GROUP */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search insights, payees, tags…  ( / )"
                    className="h-8 pl-7 text-[11px]"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1 px-2">
                      <ArrowUpDown className="h-3 w-3" /> {SORTS.find(s => s.id === sort)?.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-[10px] uppercase">Sort by</DropdownMenuLabel>
                    {SORTS.map(s => (
                      <DropdownMenuItem key={s.id} onClick={() => setSort(s.id)} className="text-[12px]">
                        {s.label} {sort === s.id && <CheckCheck className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1 px-2">
                      <Layers className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-[10px] uppercase">Group by</DropdownMenuLabel>
                    {GROUPS.map(g => (
                      <DropdownMenuItem key={g.id} onClick={() => setGroup(g.id)} className="text-[12px]">
                        {g.label} {group === g.id && <CheckCheck className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* FILTER PILLS */}
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filterOptions.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border inline-flex items-center gap-1.5',
                      filter === f.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground border-border/40'
                    )}
                  >
                    {f.label}
                    {f.n !== undefined && f.n > 0 && (
                      <span className={cn(
                        'tabular-nums text-[9px] px-1 rounded-full',
                        filter === f.id ? 'bg-primary-foreground/20' : 'bg-muted/50'
                      )}>{f.n}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* BULK BAR */}
              <AnimatePresence>
                {selected.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary/8 border border-primary/20"
                  >
                    <span className="text-[11px] font-medium">{selected.size} selected</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={bulkSnooze}>
                        <Clock className="h-3 w-3 mr-1" /> Snooze 24h
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={bulkDismiss}>
                        <X className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSelected(new Set())}>
                        Clear
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </SheetHeader>

        {/* BODY */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {tab === 'history' ? (
              <HistoryView entries={history} formatCurrency={formatCurrency} />
            ) : visible.length === 0 ? (
              <EmptyState filter={filter} totalAll={total} tab={tab} />
            ) : (
              <TooltipProvider delayDuration={200}>
                {groups.map(({ key, items }) => (
                  <div key={key}>
                    {group !== 'none' && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                          {key} · {items.length}
                        </span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {items.map((a, i) => (
                          <ActionCard
                            key={a.id}
                            action={a}
                            index={i}
                            pinned={pinnedSet.has(a.id)}
                            selected={selected.has(a.id)}
                            onSelect={() => toggleSelect(a.id)}
                            onPin={() => handleTogglePin(a.id)}
                            onResolve={handleResolve}
                            onDismiss={handleDismiss}
                            onSnooze={handleSnooze}
                            formatCurrency={formatCurrency}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </TooltipProvider>
            )}
          </div>
        </ScrollArea>

        {/* FOOTER */}
        <div className="border-t border-border/40 px-4 py-2.5 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-success" />
            On-device ML · no data leaves
          </p>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <kbd className="bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">/</kbd>
            <span>search</span>
            <kbd className="bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">⌘J</kbd>
            <span>toggle</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, tone, prefix, suffix, accent }: { label: string; value: number; tone: string; prefix?: string; suffix?: string; accent?: string }) {
  return (
    <div className="elite-card p-2 text-center overflow-hidden">
      {accent && (
        <div
          className="absolute inset-x-0 top-0 h-[2px] opacity-70"
          style={{ background: `linear-gradient(90deg, transparent, hsl(var(${accent})), transparent)` }}
        />
      )}
      <div className={cn('text-base font-bold tabular-nums leading-none', tone)}>
        {prefix}{value}{suffix}
      </div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide mt-1 truncate">{label}</div>
    </div>
  );
}

function EmptyState({ filter, totalAll, tab }: { filter: string; totalAll: number; tab: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative text-center py-14 px-4 elite-card mesh-bg overflow-hidden"
    >
      <motion.div
        aria-hidden
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl bg-success/15 pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative">
        <div className="mx-auto h-14 w-14 rounded-2xl conic-ring bg-card flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6 text-success relative z-10" />
        </div>
        <p className="text-sm font-semibold mb-1 holo-ticker inline-block">
          {tab === 'pinned' ? 'No pinned insights' :
            totalAll === 0 ? 'Nothing needs your attention' : `No ${filter} items match`}
        </p>
        <p className="text-[11px] text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
          {tab === 'pinned'
            ? 'Pin any action to keep it at the top of your inbox across sessions.'
            : totalAll === 0
              ? 'Anomaly detection, recurring trackers, savings monitors, and budget watchers will surface insights here.'
              : 'Try a different filter, search term, or grouping.'}
        </p>
      </div>
    </motion.div>
  );
}

function HistoryView({ entries, formatCurrency }: { entries: ActionHistoryEntry[]; formatCurrency: (n: number) => string }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
          <History className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold mb-1">No history yet</p>
        <p className="text-[11px] text-muted-foreground">Resolved, dismissed and snoozed actions will appear here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {entries.map(e => (
        <div key={`${e.id}-${e.at}`} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30">
          <div className={cn(
            'h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold uppercase',
            e.resolution === 'resolved' && 'bg-success/15 text-success',
            e.resolution === 'dismissed' && 'bg-muted/40 text-muted-foreground',
            e.resolution === 'snoozed' && 'bg-primary/15 text-primary',
          )}>
            {e.resolution === 'resolved' ? '✓' : e.resolution === 'snoozed' ? <Clock className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium truncate">{e.title}</p>
            <p className="text-[9px] text-muted-foreground">
              {new Date(e.at).toLocaleString()} · {e.category} · {e.resolution}
            </p>
          </div>
          {e.impact !== undefined && Math.abs(e.impact) > 0 && (
            <span className="text-[10px] font-semibold tabular-nums">{formatCurrency(Math.abs(e.impact))}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ActionCard({
  action, index, pinned, selected,
  onSelect, onPin, onResolve, onDismiss, onSnooze, formatCurrency,
}: {
  action: PriorityAction;
  index: number;
  pinned: boolean;
  selected: boolean;
  onSelect: () => void;
  onPin: () => void;
  onResolve: (a: PriorityAction) => void;
  onDismiss: (a: PriorityAction) => void;
  onSnooze: (a: PriorityAction, hours?: number) => void;
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
      transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.15) }}
      className={cn(
        'relative rounded-xl border bg-card/60 hover:bg-card/90 transition-colors overflow-hidden group',
        selected ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border/40',
        pinned && 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary'
      )}
    >
      {/* priority bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted/30">
        <div className={cn('h-full transition-all', tone.bar)} style={{ width: `${action.priority}%` }} />
      </div>

      <div className="p-3 pt-3.5">
        <div className="flex items-start gap-2.5">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="mt-0.5 h-3.5 w-3.5"
            aria-label="Select"
          />
          <div className={cn('h-8 w-8 rounded-lg bg-muted/40 ring-1 flex items-center justify-center shrink-0', tone.ring)}>
            <Icon className={cn('h-4 w-4', tone.label)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
              <span className={cn('text-[9px] font-semibold uppercase tracking-wider', tone.label)}>
                {action.severity}
              </span>
              <Badge variant="outline" className="text-[9px] capitalize h-4 px-1">
                {action.category}
              </Badge>
              {action.urgencyDays !== undefined && action.urgencyDays <= 3 && (
                <Badge className="text-[9px] h-4 px-1 bg-warning/15 text-warning border-warning/30">
                  {action.urgencyDays <= 0 ? 'now' : `${action.urgencyDays}d`}
                </Badge>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="ml-auto inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground">
                    <Gauge className="h-2.5 w-2.5" />
                    <span className="tabular-nums">{action.priority}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-[10px] p-2">
                  <p className="font-semibold mb-1">Priority {action.priority}/100</p>
                  <ScoreLine label="Severity" v={action.score.severity} max={40} />
                  <ScoreLine label="Impact"   v={action.score.impact}   max={25} />
                  <ScoreLine label="Urgency"  v={action.score.urgency}  max={20} />
                  <ScoreLine label="Confidence" v={action.score.confidence} max={10} />
                  <ScoreLine label="Recency"  v={action.score.recency}  max={5} />
                </TooltipContent>
              </Tooltip>
              <button
                onClick={onPin}
                className="text-muted-foreground hover:text-primary"
                title={pinned ? 'Unpin' : 'Pin'}
              >
                {pinned ? <Pin className="h-3 w-3 text-primary fill-primary" /> : <PinOff className="h-3 w-3" />}
              </button>
            </div>
            <h3 className="text-[13px] font-semibold leading-tight">{action.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 line-clamp-2">
              {action.description}
            </p>

            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
              {action.impact !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <span>{action.impactLabel || 'Impact'}:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(Math.abs(action.impact))}
                  </span>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> ~{action.effortMinutes}m
              </span>
              <span className="inline-flex items-center gap-1">
                <Activity className="h-2.5 w-2.5" /> {Math.round(action.confidence * 100)}%
              </span>
            </div>
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
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30 space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Evidence</p>
                  {action.evidence.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] gap-2">
                      <span className="text-muted-foreground truncate">{e.label}</span>
                      <span className="font-medium tabular-nums shrink-0">{e.value}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30 space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Score</p>
                  <ScoreLine label="Severity" v={action.score.severity} max={40} />
                  <ScoreLine label="Impact"   v={action.score.impact}   max={25} />
                  <ScoreLine label="Urgency"  v={action.score.urgency}  max={20} />
                  <ScoreLine label="Conf."    v={action.score.confidence} max={10} />
                  <ScoreLine label="Recency"  v={action.score.recency}  max={5} />
                </div>
                {action.tags.length > 0 && (
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {action.tags.map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/30">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" title="Snooze">
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-[10px] uppercase">Snooze</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onSnooze(action, 1)} className="text-[12px]">1 hour</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(action, 24)} className="text-[12px]">Tomorrow</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(action, 24 * 7)} className="text-[12px]">Next week</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(action, 24 * 30)} className="text-[12px]">Next month</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

function ScoreLine({ label, v, max }: { label: string; v: number; max: number }) {
  const pct = Math.round((v / max) * 100);
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-medium tabular-nums w-10 text-right">{v}/{max}</span>
    </div>
  );
}
