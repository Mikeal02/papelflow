import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Activity, Layers, Radar as RadarIcon, X, ChevronRight,
  CheckCircle2, Gauge, Sparkles, Filter, ShieldCheck,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, Tooltip as RTooltip, Area, AreaChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, Bar, BarChart, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { runEliteAnomalies, EliteAnomaly, Severity, DetectorKey } from '@/lib/intelligence/anomalyElite';

const severityRing: Record<Severity, string> = {
  critical: 'border-expense/60 bg-expense/10',
  high: 'border-warning/60 bg-warning/10',
  medium: 'border-primary/60 bg-primary/5',
  low: 'border-border/60 bg-muted/30',
};
const severityChip: Record<Severity, string> = {
  critical: 'bg-expense/20 text-expense border-expense/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  medium: 'bg-primary/20 text-primary border-primary/30',
  low: 'bg-muted text-muted-foreground border-border',
};
const gradeColor: Record<EliteAnomaly['riskGrade'], string> = {
  F: 'text-expense', D: 'text-expense', C: 'text-warning', B: 'text-primary', A: 'text-income',
};

export const AnomalyDetector = () => {
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | Severity>('all');
  const [selected, setSelected] = useState<EliteAnomaly | null>(null);

  const report = useMemo(() => runEliteAnomalies(transactions as any), [transactions]);

  const visible = useMemo(() => {
    return report.anomalies
      .filter(a => !dismissed.has(a.id))
      .filter(a => filter === 'all' ? true : a.severity === filter);
  }, [report.anomalies, dismissed, filter]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 } as Record<Severity, number>;
    for (const a of report.anomalies) c[a.severity]++;
    return c;
  }, [report.anomalies]);

  const radarData = useMemo(
    () => report.detectorStats.map(d => ({
      detector: d.label.replace(/ \(.+\)/, ''),
      score: Math.round(d.meanScore * 100),
      fires: d.fires,
    })),
    [report.detectorStats]
  );

  if (report.anomalies.length === 0) {
    return (
      <Card className="stat-card">
        <CardContent className="py-10 text-center">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-income/10 flex items-center justify-center border border-income/20"
          >
            <ShieldCheck className="h-8 w-8 text-income" />
          </motion.div>
          <h3 className="font-semibold text-lg">Perimeter Clean</h3>
          <p className="text-xs text-muted-foreground mt-1">
            5-detector ensemble found no statistically meaningful outliers across {report.globals.scanned} expenses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="stat-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              Threat Intelligence
              <Badge variant="outline" className="text-[9px] ml-1 gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Ensemble
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              5-detector vote · {report.globals.flagged} flagged · {report.globals.scanned} scanned
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Health</div>
            <div className={cn(
              'text-2xl font-bold tabular-nums leading-none',
              report.globals.health >= 70 ? 'text-income' : report.globals.health >= 40 ? 'text-warning' : 'text-expense'
            )}>
              {Math.round(report.globals.health)}
            </div>
          </div>
        </div>

        {/* Severity strip */}
        <div className="grid grid-cols-4 gap-1.5 mt-3">
          {(['critical', 'high', 'medium', 'low'] as Severity[]).map(sev => (
            <button
              key={sev}
              onClick={() => setFilter(f => f === sev ? 'all' : sev)}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-left transition-all',
                filter === sev ? severityRing[sev] : 'border-border/40 bg-muted/20 hover:bg-muted/40',
              )}
            >
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{sev}</div>
              <div className="text-sm font-bold tabular-nums">{counts[sev]}</div>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="alerts">
          <TabsList className="grid grid-cols-3 h-8">
            <TabsTrigger value="alerts" className="text-xs gap-1">
              <Activity className="h-3 w-3" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="detectors" className="text-xs gap-1">
              <RadarIcon className="h-3 w-3" /> Detectors
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1">
              <Layers className="h-3 w-3" /> Timeline
            </TabsTrigger>
          </TabsList>

          {/* ALERTS */}
          <TabsContent value="alerts" className="space-y-2 mt-3">
            {filter !== 'all' && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Filter className="h-3 w-3" /> Filtered by <Badge className={severityChip[filter as Severity]}>{filter}</Badge>
                <button onClick={() => setFilter('all')} className="underline">clear</button>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {visible.map((a, i) => {
                const acked = acknowledged.has(a.id);
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: acked ? 0.55 : 1, y: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      'relative rounded-xl border p-3 group',
                      severityRing[a.severity],
                    )}
                  >
                    {a.severity === 'critical' && !acked && (
                      <motion.div
                        className="absolute inset-0 rounded-xl border border-expense/50 pointer-events-none"
                        animate={{ opacity: [0.2, 0.7, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    <div className="flex items-start justify-between gap-3 relative">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="text-center shrink-0">
                          <div className={cn('text-2xl font-bold leading-none tabular-nums', gradeColor[a.riskGrade])}>
                            {a.riskGrade}
                          </div>
                          <div className="text-[8px] text-muted-foreground uppercase mt-0.5">grade</div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm truncate">{a.payee}</h4>
                            <Badge variant="outline" className={cn('text-[9px] uppercase', severityChip[a.severity])}>
                              {a.severity}
                            </Badge>
                            {a.votes.filter(v => v.fired).length >= 3 && (
                              <Badge variant="outline" className="text-[9px] bg-expense/10 text-expense border-expense/30">
                                Consensus
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {a.category || 'Uncategorized'} · {format(parseISO(a.date), 'MMM d')} · expected {formatCurrency(a.baseline.expected)}
                          </p>

                          {/* Driver chips */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {a.drivers.map(d => (
                              <span
                                key={d.label}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-muted/50 border border-border/40 tabular-nums"
                                title={`${d.label}: ${d.value}`}
                              >
                                {d.label.split(' ')[0]} <span className="text-muted-foreground">{d.value}</span>
                              </span>
                            ))}
                          </div>

                          {/* Score bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${a.ensembleScore * 100}%` }}
                                transition={{ duration: 0.6, delay: i * 0.03 }}
                                className={cn(
                                  'h-full',
                                  a.severity === 'critical' ? 'bg-expense' :
                                  a.severity === 'high' ? 'bg-warning' :
                                  a.severity === 'medium' ? 'bg-primary' : 'bg-muted-foreground',
                                )}
                              />
                            </div>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {(a.ensembleScore * 100).toFixed(0)} · {Math.round(a.confidence * 100)}% conf
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold tabular-nums">{formatCurrency(a.amount)}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelected(selected?.id === a.id ? null : a)}
                            className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center"
                            title="Inspect"
                          >
                            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', selected?.id === a.id && 'rotate-90')} />
                          </button>
                          <button
                            onClick={() => setAcknowledged(s => { const n = new Set(s); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n; })}
                            className={cn('h-6 w-6 rounded-md flex items-center justify-center', acked ? 'bg-income/20 text-income' : 'hover:bg-muted')}
                            title="Acknowledge"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDismissed(s => new Set(s).add(a.id))}
                            className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted flex items-center justify-center transition-opacity"
                            title="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded inspector */}
                    <AnimatePresence>
                      {selected?.id === a.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-border/40 overflow-hidden"
                        >
                          <div className="grid grid-cols-5 gap-1.5">
                            {a.votes.map(v => (
                              <div
                                key={v.key}
                                className={cn(
                                  'rounded-lg border p-2 text-center',
                                  v.fired ? 'border-warning/40 bg-warning/5' : 'border-border/40 bg-muted/20',
                                )}
                              >
                                <div className="text-[8px] uppercase text-muted-foreground truncate">{v.label.split(' ')[0]}</div>
                                <div className="text-sm font-bold tabular-nums mt-0.5">{Math.round(v.score * 100)}</div>
                                <div className="text-[8px] text-muted-foreground truncate">{v.detail}</div>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                            <div className="rounded bg-muted/30 p-2">
                              <div className="text-muted-foreground">Median</div>
                              <div className="font-semibold tabular-nums">{formatCurrency(a.baseline.median)}</div>
                            </div>
                            <div className="rounded bg-muted/30 p-2">
                              <div className="text-muted-foreground">Expected</div>
                              <div className="font-semibold tabular-nums">{formatCurrency(a.baseline.expected)}</div>
                            </div>
                            <div className="rounded bg-muted/30 p-2">
                              <div className="text-muted-foreground">σ Spread</div>
                              <div className="font-semibold tabular-nums">{formatCurrency(a.baseline.spread)}</div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {dismissed.size > 0 && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDismissed(new Set())}>
                Restore dismissed ({dismissed.size})
              </Button>
            )}
          </TabsContent>

          {/* DETECTORS */}
          <TabsContent value="detectors" className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="detector" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                    <RTooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {report.detectorStats.map(d => (
                  <div key={d.key} className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] text-muted-foreground w-20 truncate">{d.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${d.meanScore * 100}%` }} />
                    </div>
                    <span className="tabular-nums text-[10px] text-muted-foreground w-16 text-right">
                      {d.fires} fires
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
              <div className="rounded bg-muted/30 p-2">
                <div className="text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> FP budget</div>
                <div className="font-semibold tabular-nums">{report.globals.falsePositiveBudget}</div>
              </div>
              <div className="rounded bg-muted/30 p-2">
                <div className="text-muted-foreground">Coverage</div>
                <div className="font-semibold tabular-nums">{Math.round(report.globals.coverage * 100)}%</div>
              </div>
              <div className="rounded bg-muted/30 p-2">
                <div className="text-muted-foreground">Health</div>
                <div className="font-semibold tabular-nums">{Math.round(report.globals.health)}/100</div>
              </div>
            </div>
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="mt-3">
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.timeline}>
                  <defs>
                    <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} tickFormatter={(d) => format(parseISO(d), 'M/d')} />
                  <YAxis hide />
                  <RTooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="expected" stroke="hsl(var(--primary))" fill="url(#exp)" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[80px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.timeline}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <RTooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                  />
                  <Bar dataKey="anomalyCount" radius={[3, 3, 0, 0]}>
                    {report.timeline.map((d, i) => (
                      <Cell key={i} fill={d.anomalyCount > 0 ? 'hsl(var(--expense))' : 'hsl(var(--muted))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              Holt-Winters expected vs actual · bars show anomaly density (last 30d)
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
