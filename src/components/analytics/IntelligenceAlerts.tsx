import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, X, Clock, ShieldAlert, Store, Network, TrendingUp,
  AlertTriangle, Zap, RefreshCw, Settings2, Search, Download, LayoutGrid,
  Activity, Volume2, VolumeX, ChevronDown, Sparkles, Filter,
  CheckSquare, Square, History, Inbox,
} from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEliteIntelligence, useIntelligenceAlerts } from '@/hooks/useEliteIntelligence';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  loadAlertSettings, saveAlertSettings, type AlertSettings, DEFAULT_SETTINGS,
} from '@/lib/intelligence/alertSettings';

// ───────────────────────────────────────────────────────────────────────────
// Meta tables

const kindMeta: Record<string, { icon: any; label: string; tone: string }> = {
  anomaly: { icon: ShieldAlert, label: 'Anomaly', tone: 'text-expense' },
  merchant_churn: { icon: Store, label: 'Churn risk', tone: 'text-warning' },
  merchant_revival: { icon: TrendingUp, label: 'Revival', tone: 'text-income' },
  wallet_concentration: { icon: Network, label: 'Wallet HHI', tone: 'text-primary' },
  next_visit: { icon: Clock, label: 'Next visit', tone: 'text-muted-foreground' },
  high_clv_at_risk: { icon: AlertTriangle, label: 'CLV at risk', tone: 'text-warning' },
};

const sevChip: Record<string, string> = {
  critical: 'bg-expense/20 text-expense border-expense/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  medium: 'bg-primary/20 text-primary border-primary/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const sevRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

type Filter = 'all' | 'open' | 'acknowledged' | 'scheduled' | 'snoozed';
type ViewMode = 'list' | 'timeline' | 'heatmap';
type SortMode = 'severity' | 'recent' | 'fired';

// ───────────────────────────────────────────────────────────────────────────
// Subcomponents

const Sparkline = ({ data, height = 28 }: { data: number[]; height?: number }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 140;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`).join(' ');
  return (
    <svg width={w} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill="url(#spark-grad)" />
    </svg>
  );
};

const Heatmap = ({ alerts }: { alerts: any[] }) => {
  const grid = useMemo(() => {
    const days = 14;
    const today = startOfDay(new Date());
    const kinds = Object.keys(kindMeta);
    const m: Record<string, Record<number, { count: number; sev: number }>> = {};
    for (const k of kinds) m[k] = {};
    for (const a of alerts) {
      const t = startOfDay(new Date(a.last_fired_at || a.scheduled_for));
      const diff = Math.round((today.getTime() - t.getTime()) / 86400000);
      if (diff < 0 || diff >= days) continue;
      const k = a.kind;
      if (!m[k]) m[k] = {};
      const cell = m[k][diff] || { count: 0, sev: 0 };
      cell.count++;
      cell.sev = Math.max(cell.sev, sevRank[a.severity] || 1);
      m[k][diff] = cell;
    }
    return { grid: m, days, kinds };
  }, [alerts]);

  const sevColor = (sev: number, count: number) => {
    if (!count) return 'bg-muted/20';
    const op = Math.min(0.95, 0.25 + count * 0.18);
    if (sev >= 4) return `bg-expense`;
    if (sev >= 3) return `bg-warning`;
    if (sev >= 2) return `bg-primary`;
    return `bg-muted-foreground/60`;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Last 14 days</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-muted/40" />
          <div className="h-2 w-2 rounded-sm bg-primary/40" />
          <div className="h-2 w-2 rounded-sm bg-primary" />
          <div className="h-2 w-2 rounded-sm bg-warning" />
          <div className="h-2 w-2 rounded-sm bg-expense" />
        </div>
      </div>
      <div className="space-y-1">
        {grid.kinds.map(k => {
          const Icon = kindMeta[k].icon;
          return (
            <div key={k} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 w-32 shrink-0">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] truncate">{kindMeta[k].label}</span>
              </div>
              <div className="flex gap-0.5 flex-1">
                {Array.from({ length: grid.days }).map((_, i) => {
                  const idx = grid.days - 1 - i;
                  const cell = grid.grid[k]?.[idx];
                  const sev = cell?.sev || 0;
                  const count = cell?.count || 0;
                  const opacity = count ? Math.min(1, 0.35 + count * 0.18) : 1;
                  return (
                    <div
                      key={i}
                      style={{ opacity }}
                      title={`${format(subDays(new Date(), idx), 'MMM d')}: ${count} alerts`}
                      className={cn(
                        'flex-1 h-5 rounded-sm transition-transform hover:scale-110',
                        sevColor(sev, count)
                      )}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Timeline = ({ alerts, onSelect }: { alerts: any[]; onSelect: (a: any) => void }) => {
  const sorted = [...alerts].sort((a, b) =>
    new Date(b.last_fired_at || b.scheduled_for).getTime() -
    new Date(a.last_fired_at || a.scheduled_for).getTime()
  );
  return (
    <div className="relative pl-5">
      <div className="absolute left-2 top-1 bottom-1 w-px bg-border/60" />
      {sorted.map(a => {
        const Icon = kindMeta[a.kind]?.icon || Bell;
        const t = new Date(a.last_fired_at || a.scheduled_for);
        return (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            className="relative w-full text-left mb-2 group"
          >
            <div className={cn(
              'absolute -left-3.5 top-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-background',
              a.severity === 'critical' && 'bg-expense',
              a.severity === 'high' && 'bg-warning',
              a.severity === 'medium' && 'bg-primary',
              a.severity === 'low' && 'bg-muted-foreground',
            )} />
            <div className="rounded-lg border border-border/40 bg-card/30 p-2.5 group-hover:bg-card/60 transition-colors">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Icon className="h-3 w-3" />
                <span className="uppercase tracking-wide">{kindMeta[a.kind]?.label || a.kind}</span>
                <span>·</span>
                <span className="tabular-nums">{format(t, 'MMM d, HH:mm')}</span>
              </div>
              <div className="text-sm font-medium mt-1 truncate">{a.title}</div>
            </div>
          </button>
        );
      })}
      {sorted.length === 0 && (
        <div className="text-xs text-muted-foreground py-8 text-center">No history yet.</div>
      )}
    </div>
  );
};

const RulesPanel = ({
  settings, onChange,
}: { settings: AlertSettings; onChange: (s: AlertSettings) => void }) => {
  const update = <K extends keyof AlertSettings>(k: K, v: AlertSettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Quiet hours start</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {String(settings.quietHourStart).padStart(2, '0')}:00
          </span>
        </div>
        <Slider min={0} max={23} step={1} value={[settings.quietHourStart]}
          onValueChange={v => update('quietHourStart', v[0])} />
        <div className="flex items-center justify-between">
          <Label className="text-xs">Quiet hours end</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {String(settings.quietHourEnd).padStart(2, '0')}:00
          </span>
        </div>
        <Slider min={0} max={23} step={1} value={[settings.quietHourEnd]}
          onValueChange={v => update('quietHourEnd', v[0])} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Max alerts per run</Label>
          <span className="text-xs tabular-nums text-muted-foreground">{settings.maxPerRun}</span>
        </div>
        <Slider min={5} max={80} step={5} value={[settings.maxPerRun]}
          onValueChange={v => update('maxPerRun', v[0])} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Minimum severity</Label>
        <Select value={settings.minSeverity}
          onValueChange={v => update('minSeverity', v as any)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low and above</SelectItem>
            <SelectItem value="medium">Medium and above</SelectItem>
            <SelectItem value="high">High and above</SelectItem>
            <SelectItem value="critical">Critical only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Enabled alert kinds</Label>
        <div className="space-y-1.5">
          {Object.entries(kindMeta).map(([k, m]) => {
            const Icon = m.icon;
            return (
              <div key={k} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{m.label}</span>
                </div>
                <Switch checked={settings.enabledKinds[k] !== false}
                  onCheckedChange={v =>
                    update('enabledKinds', { ...settings.enabledKinds, [k]: v })
                  } />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Sound on critical</span>
          </div>
          <Switch checked={settings.soundOnCritical}
            onCheckedChange={v => update('soundOnCritical', v)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">Haptic on high+</span>
          </div>
          <Switch checked={settings.hapticOnHigh}
            onCheckedChange={v => update('hapticOnHigh', v)} />
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full"
        onClick={() => onChange(DEFAULT_SETTINGS)}>
        Reset to defaults
      </Button>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// Main component

export const IntelligenceAlerts = () => {
  const intel = useEliteIntelligence();
  const { data: alerts = [], isLoading } = useIntelligenceAlerts();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<Filter>('open');
  const [view, setView] = useState<ViewMode>('list');
  const [sort, setSort] = useState<SortMode>('severity');
  const [query, setQuery] = useState('');
  const [activeKinds, setActiveKinds] = useState<Set<string>>(new Set());
  const [activeSevs, setActiveSevs] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspect, setInspect] = useState<any | null>(null);
  const [settings, setSettings] = useState<AlertSettings>(() => loadAlertSettings());

  const lastCriticalRef = useRef<string | null>(null);

  // Sync settings from localStorage events
  useEffect(() => {
    const h = () => setSettings(loadAlertSettings());
    window.addEventListener('intel-alert-settings-changed', h);
    return () => window.removeEventListener('intel-alert-settings-changed', h);
  }, []);

  const persistSettings = (s: AlertSettings) => {
    setSettings(s);
    saveAlertSettings(s);
  };

  const now = Date.now();

  // Critical alert sensory feedback
  useEffect(() => {
    const critical = (alerts as any[]).find(
      a => a.severity === 'critical' && !a.acknowledged_at && !a.dismissed_at
    );
    if (!critical || critical.id === lastCriticalRef.current) return;
    lastCriticalRef.current = critical.id;
    if (settings.hapticOnHigh && 'vibrate' in navigator) {
      try { navigator.vibrate([30, 40, 30]); } catch {}
    }
    if (settings.soundOnCritical) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.value = 0.06;
        o.start();
        o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        o.stop(ctx.currentTime + 0.22);
      } catch {}
    }
  }, [alerts, settings.soundOnCritical, settings.hapticOnHigh]);

  // 14-day sparkline of alert volume
  const sparkData = useMemo(() => {
    const days = 14;
    const today = startOfDay(new Date());
    const buckets = new Array(days).fill(0);
    for (const a of alerts as any[]) {
      const t = startOfDay(new Date(a.last_fired_at || a.scheduled_for));
      const diff = Math.round((today.getTime() - t.getTime()) / 86400000);
      if (diff >= 0 && diff < days) buckets[days - 1 - diff]++;
    }
    return buckets;
  }, [alerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (alerts as any[]).filter(a => {
      const scheduled = new Date(a.scheduled_for).getTime() > now;
      const snoozed = a.snooze_until && new Date(a.snooze_until).getTime() > now;
      if (filter === 'open') {
        if (a.acknowledged_at || scheduled || snoozed) return false;
      } else if (filter === 'acknowledged') {
        if (!a.acknowledged_at) return false;
      } else if (filter === 'scheduled') {
        if (!scheduled) return false;
      } else if (filter === 'snoozed') {
        if (!snoozed) return false;
      }
      if (activeKinds.size && !activeKinds.has(a.kind)) return false;
      if (activeSevs.size && !activeSevs.has(a.severity)) return false;
      if (q && !(a.title?.toLowerCase().includes(q) || a.body?.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sort === 'severity') return (sevRank[b.severity] || 0) - (sevRank[a.severity] || 0);
      if (sort === 'fired') return (b.fired_count || 0) - (a.fired_count || 0);
      return new Date(b.last_fired_at || b.scheduled_for).getTime() -
             new Date(a.last_fired_at || a.scheduled_for).getTime();
    });
    return list;
  }, [alerts, filter, activeKinds, activeSevs, query, sort, now]);

  const counts = useMemo(() => {
    let crit = 0, high = 0, med = 0, low = 0;
    for (const a of alerts as any[]) {
      if (a.acknowledged_at || a.dismissed_at) continue;
      if (a.severity === 'critical') crit++;
      else if (a.severity === 'high') high++;
      else if (a.severity === 'medium') med++;
      else low++;
    }
    return { crit, high, med, low, total: crit + high + med + low };
  }, [alerts]);

  // Actions
  const ack = async (ids: string[]) => {
    await supabase.from('intelligence_alerts')
      .update({ acknowledged_at: new Date().toISOString() }).in('id', ids);
    qc.invalidateQueries({ queryKey: ['intelligence-alerts'] });
    toast({ title: `Acknowledged ${ids.length} alert${ids.length > 1 ? 's' : ''}`, duration: 3000 });
  };
  const dismiss = async (ids: string[]) => {
    await supabase.from('intelligence_alerts')
      .update({ dismissed_at: new Date().toISOString() }).in('id', ids);
    qc.invalidateQueries({ queryKey: ['intelligence-alerts'] });
    toast({ title: `Dismissed ${ids.length} alert${ids.length > 1 ? 's' : ''}`, duration: 3000 });
  };
  const snooze = async (ids: string[], hours: number) => {
    const until = new Date(Date.now() + hours * 3600000).toISOString();
    await supabase.from('intelligence_alerts')
      .update({ snooze_until: until }).in('id', ids);
    qc.invalidateQueries({ queryKey: ['intelligence-alerts'] });
    toast({
      title: `Snoozed ${ids.length} for ${hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`}`,
      duration: 3000,
    });
    setSelected(new Set());
  };

  const toggleSelect = (id: string) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(a => a.id)));
  const clearSelection = () => setSelected(new Set());

  const exportCsv = () => {
    const rows = [
      ['id', 'kind', 'severity', 'title', 'fired_count', 'scheduled_for', 'last_fired_at'],
      ...(alerts as any[]).map(a => [
        a.id, a.kind, a.severity, JSON.stringify(a.title), a.fired_count,
        a.scheduled_for, a.last_fired_at,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `intelligence-alerts-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (selected.size === 0) return;
      if (e.key === 'a') ack(Array.from(selected));
      else if (e.key === 'd') dismiss(Array.from(selected));
      else if (e.key === 's') snooze(Array.from(selected), 24);
      else if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selected]);

  const toggleKind = (k: string) =>
    setActiveKinds(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleSev = (s: string) =>
    setActiveSevs(set => { const n = new Set(set); n.has(s) ? n.delete(s) : n.add(s); return n; });

  return (
    <>
      <Card className="stat-card overflow-hidden">
        <CardHeader className="pb-3 space-y-3">
          {/* Top row: title + metrics + actions */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-border/30 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-primary" />
                {counts.crit > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-expense ring-2 ring-card animate-pulse" />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  Mission Control
                  <Sparkles className="h-3 w-3 text-primary" />
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  <span className="inline-flex items-center gap-1">
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      intel.loading ? 'bg-primary animate-pulse' : 'bg-income'
                    )} />
                    {intel.mode}
                  </span>
                  {' · '}{intel.durationMs ? `${intel.durationMs}ms` : 'idle'}
                  {intel.diff?.added?.length ? ` · +${intel.diff.added.length} new tx` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Filter">
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Kind</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(kindMeta).map(([k, m]) => (
                        <button key={k} onClick={() => toggleKind(k)}
                          className={cn(
                            'text-[10px] px-2 py-1 rounded-md border transition-colors',
                            activeKinds.has(k)
                              ? 'bg-primary/20 border-primary/40 text-primary'
                              : 'border-border/40 text-muted-foreground hover:bg-muted/40'
                          )}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Severity</div>
                    <div className="flex flex-wrap gap-1">
                      {['critical', 'high', 'medium', 'low'].map(s => (
                        <button key={s} onClick={() => toggleSev(s)}
                          className={cn(
                            'text-[10px] px-2 py-1 rounded-md border capitalize transition-colors',
                            activeSevs.has(s) ? sevChip[s] : 'border-border/40 text-muted-foreground hover:bg-muted/40'
                          )}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <Select value={sort} onValueChange={v => setSort(v as SortMode)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sort" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severity">Sort: severity</SelectItem>
                      <SelectItem value="recent">Sort: most recent</SelectItem>
                      <SelectItem value="fired">Sort: most fired</SelectItem>
                    </SelectContent>
                  </Select>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportCsv} title="Export CSV">
                <Download className="h-4 w-4" />
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Rules">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Alert Rules</SheetTitle>
                  </SheetHeader>
                  <RulesPanel settings={settings} onChange={persistSettings} />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Metrics ribbon */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Critical', val: counts.crit, cls: 'text-expense' },
              { label: 'High', val: counts.high, cls: 'text-warning' },
              { label: 'Medium', val: counts.med, cls: 'text-primary' },
              { label: 'Low', val: counts.low, cls: 'text-muted-foreground' },
            ].map(m => (
              <div key={m.label} className="rounded-lg border border-border/30 bg-card/30 px-2 py-1.5">
                <div className={cn('text-base font-semibold tabular-nums', m.cls)}>{m.val}</div>
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
              </div>
            ))}
            <div className="rounded-lg border border-border/30 bg-card/30 px-2 py-1.5">
              <Sparkline data={sparkData} height={28} />
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">14d trend</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search alerts… (press a=ack, d=dismiss, s=snooze)"
              className="h-8 pl-8 text-xs" />
          </div>

          {/* Tabs + view toggle */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Tabs value={filter} onValueChange={v => setFilter(v as Filter)} className="flex-1 min-w-0">
              <TabsList className="grid grid-cols-5 w-full h-8">
                <TabsTrigger value="open" className="text-[11px]">Open</TabsTrigger>
                <TabsTrigger value="scheduled" className="text-[11px]">Scheduled</TabsTrigger>
                <TabsTrigger value="snoozed" className="text-[11px]">Snoozed</TabsTrigger>
                <TabsTrigger value="acknowledged" className="text-[11px]">Acked</TabsTrigger>
                <TabsTrigger value="all" className="text-[11px]">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-0.5 rounded-md border border-border/40 p-0.5">
              {([
                ['list', Inbox], ['timeline', History], ['heatmap', LayoutGrid],
              ] as const).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v as ViewMode)}
                  className={cn(
                    'h-6 w-7 rounded flex items-center justify-center transition-colors',
                    view === v ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted/40'
                  )}>
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>

          {/* Bulk action bar */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2"
              >
                <CheckSquare className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs">{selected.size} selected</span>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-6 text-xs"
                  onClick={() => ack(Array.from(selected))}>Ack all</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs"
                  onClick={() => snooze(Array.from(selected), 24)}>Snooze 24h</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs"
                  onClick={() => dismiss(Array.from(selected))}>Dismiss</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs"
                  onClick={clearSelection}>Clear</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
          {(isLoading || intel.loading) && !filtered.length && (
            <div className="text-sm text-muted-foreground py-8 text-center flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Computing intelligence in background…
            </div>
          )}

          {!intel.loading && !filtered.length && view === 'list' && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <Zap className="h-5 w-5 mx-auto mb-2 opacity-50" />
              No {filter !== 'all' ? filter : ''} alerts matching filters.
            </div>
          )}

          {view === 'heatmap' && <Heatmap alerts={alerts as any[]} />}
          {view === 'timeline' && <Timeline alerts={filtered} onSelect={setInspect} />}

          {view === 'list' && (
            <>
              {filtered.length > 0 && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 pb-1">
                  <button onClick={selected.size === filtered.length ? clearSelection : selectAll}
                    className="flex items-center gap-1 hover:text-foreground transition-colors">
                    {selected.size === filtered.length ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                    Select all
                  </button>
                  <span>{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              <AnimatePresence initial={false}>
                {filtered.map((a: any) => {
                  const meta = kindMeta[a.kind] || { icon: Bell, label: a.kind, tone: '' };
                  const Icon = meta.icon;
                  const sched = new Date(a.scheduled_for);
                  const isFuture = sched.getTime() > now;
                  const isSnoozed = a.snooze_until && new Date(a.snooze_until).getTime() > now;
                  const isSelected = selected.has(a.id);
                  return (
                    <motion.div
                      key={a.id} layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
                      className={cn(
                        'rounded-xl border p-3 bg-card/40 transition-colors cursor-pointer',
                        a.acknowledged_at && 'opacity-60',
                        isSelected && 'border-primary/50 bg-primary/5',
                        a.severity === 'critical' && !a.acknowledged_at &&
                          'border-l-2 border-l-expense',
                        a.severity === 'high' && !a.acknowledged_at &&
                          'border-l-2 border-l-warning',
                      )}
                      onClick={() => setInspect(a)}
                    >
                      <div className="flex items-start gap-3">
                        <button onClick={e => { e.stopPropagation(); toggleSelect(a.id); }}
                          className="mt-0.5 shrink-0">
                          {isSelected
                            ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                            : <Square className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />}
                        </button>
                        <div className={cn(
                          'h-8 w-8 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center shrink-0',
                          meta.tone
                        )}>
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
                            {isSnoozed && (
                              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                                <VolumeX className="h-3 w-3" /> snoozed
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-sm mt-1 truncate">{a.title}</div>
                          {a.body && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                          )}
                          <div className="flex items-center gap-1 mt-2 flex-wrap" onClick={e => e.stopPropagation()}>
                            {!a.acknowledged_at && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                                onClick={() => ack([a.id])}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Ack
                              </Button>
                            )}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                  <Clock className="h-3 w-3 mr-1" /> Snooze <ChevronDown className="h-3 w-3 ml-0.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-40 p-1">
                                {[
                                  { l: '1 hour', h: 1 },
                                  { l: '4 hours', h: 4 },
                                  { l: '24 hours', h: 24 },
                                  { l: '3 days', h: 72 },
                                  { l: '1 week', h: 168 },
                                ].map(o => (
                                  <button key={o.h}
                                    onClick={() => snooze([a.id], o.h)}
                                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/60">
                                    {o.l}
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              onClick={() => dismiss([a.id])}>
                              <X className="h-3 w-3 mr-1" /> Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </CardContent>
      </Card>

      {/* Inspector drawer */}
      <Sheet open={!!inspect} onOpenChange={o => !o && setInspect(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          {inspect && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Badge className={sevChip[inspect.severity]}>{inspect.severity}</Badge>
                  {kindMeta[inspect.kind]?.label || inspect.kind}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div>
                  <h3 className="font-semibold">{inspect.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{inspect.body}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border/40 p-2">
                    <div className="text-muted-foreground text-[10px] uppercase">Fired</div>
                    <div className="font-medium tabular-nums">{inspect.fired_count}×</div>
                  </div>
                  <div className="rounded-lg border border-border/40 p-2">
                    <div className="text-muted-foreground text-[10px] uppercase">Last fired</div>
                    <div className="font-medium">
                      {formatDistanceToNow(new Date(inspect.last_fired_at || inspect.scheduled_for), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/40 p-2">
                    <div className="text-muted-foreground text-[10px] uppercase">Scheduled</div>
                    <div className="font-medium">{format(new Date(inspect.scheduled_for), 'MMM d, HH:mm')}</div>
                  </div>
                  <div className="rounded-lg border border-border/40 p-2">
                    <div className="text-muted-foreground text-[10px] uppercase">Dedup key</div>
                    <div className="font-mono text-[10px] truncate">{inspect.dedup_key}</div>
                  </div>
                </div>
                {inspect.payload && Object.keys(inspect.payload).length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Payload</div>
                    <pre className="text-[10px] font-mono bg-muted/30 rounded-lg p-3 overflow-auto max-h-64 border border-border/40">
                      {JSON.stringify(inspect.payload, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="flex gap-2">
                  {!inspect.acknowledged_at && (
                    <Button size="sm" onClick={() => { ack([inspect.id]); setInspect(null); }} className="flex-1">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    onClick={() => { snooze([inspect.id], 24); setInspect(null); }} className="flex-1">
                    <Clock className="h-3.5 w-3.5 mr-1" /> Snooze 24h
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => { dismiss([inspect.id]); setInspect(null); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
