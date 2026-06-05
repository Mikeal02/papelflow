import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store, TrendingUp, TrendingDown, Minus, Network, Crown, AlertOctagon,
  Heart, Calendar, Sparkles, Target, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip as RTooltip,
  CartesianGrid, LineChart, Line, BarChart, Bar, Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { runMerchantElite, EliteMerchant, MerchantSegment } from '@/lib/intelligence/merchantElite';

const segmentMeta: Record<MerchantSegment, { color: string; icon: any; label: string }> = {
  Champion: { color: 'text-income border-income/40 bg-income/10', icon: Crown, label: 'Champion' },
  Loyal: { color: 'text-primary border-primary/40 bg-primary/10', icon: Heart, label: 'Loyal' },
  Potential: { color: 'text-chart-3 border-chart-3/40 bg-chart-3/10', icon: Sparkles, label: 'Potential' },
  New: { color: 'text-chart-4 border-chart-4/40 bg-chart-4/10', icon: Target, label: 'New' },
  AtRisk: { color: 'text-warning border-warning/40 bg-warning/10', icon: AlertOctagon, label: 'At Risk' },
  Hibernating: { color: 'text-muted-foreground border-border bg-muted/20', icon: Minus, label: 'Hibernating' },
  Lost: { color: 'text-expense border-expense/40 bg-expense/10', icon: TrendingDown, label: 'Lost' },
};

const trendIcons = { accelerating: TrendingUp, stable: Minus, decelerating: TrendingDown };
const trendColors = {
  accelerating: 'text-expense',
  stable: 'text-muted-foreground',
  decelerating: 'text-income',
};

const initials = (s: string) => s.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const colorFromName = (s: string) => {
  const palette = [
    'from-primary to-accent', 'from-chart-1 to-chart-3', 'from-chart-4 to-chart-5',
    'from-income to-chart-3', 'from-chart-6 to-primary', 'from-warning to-chart-4',
  ];
  const h = s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[h % palette.length];
};

const Sparkline = ({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) => (
  <div className="h-6 w-16">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.map((v, i) => ({ i, v }))}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const MerchantIntelligence = () => {
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();
  const [tab, setTab] = useState('top');
  const [selectedSegment, setSelectedSegment] = useState<MerchantSegment | 'All'>('All');

  const report = useMemo(() => runMerchantElite(transactions as any), [transactions]);

  if (report.merchants.length === 0) {
    return (
      <Card className="stat-card">
        <CardContent className="py-8 text-center">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No merchant data yet</p>
        </CardContent>
      </Card>
    );
  }

  const filtered = selectedSegment === 'All'
    ? report.merchants
    : report.merchants.filter(m => m.segment === selectedSegment);

  const rfmScatter = report.merchants.map(m => ({
    x: Math.min(180, m.daysSinceLast),
    y: m.visits,
    z: m.totalSpent,
    name: m.name,
    segment: m.segment,
  }));

  const segmentChart = (Object.entries(report.segments) as [MerchantSegment, number][])
    .filter(([, c]) => c > 0)
    .map(([s, count]) => ({ segment: s, count }));

  return (
    <Card className="stat-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Merchant Intelligence
              <Badge variant="outline" className="text-[9px] ml-1 gap-1">
                <Sparkles className="h-2.5 w-2.5" /> RFM · CLV · Graph
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {report.merchants.length} merchants · {report.graph.length} co-visit edges
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">12m CLV</div>
            <div className="text-lg font-bold tabular-nums text-income leading-none">
              {formatCurrency(report.projectedAnnual)}
            </div>
          </div>
        </div>

        {/* Segment pills */}
        <div className="flex flex-wrap gap-1 mt-3">
          <button
            onClick={() => setSelectedSegment('All')}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] border',
              selectedSegment === 'All' ? 'bg-foreground text-background border-foreground' : 'border-border/40 bg-muted/30 hover:bg-muted/50',
            )}
          >
            All · {report.merchants.length}
          </button>
          {(Object.entries(report.segments) as [MerchantSegment, number][])
            .filter(([, c]) => c > 0)
            .map(([seg, count]) => {
              const meta = segmentMeta[seg];
              const Icon = meta.icon;
              return (
                <button
                  key={seg}
                  onClick={() => setSelectedSegment(s => s === seg ? 'All' : seg)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] border gap-1 inline-flex items-center',
                    selectedSegment === seg ? meta.color : 'border-border/40 bg-muted/30 hover:bg-muted/50',
                  )}
                >
                  <Icon className="h-2.5 w-2.5" /> {meta.label} · {count}
                </button>
              );
            })}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 h-8">
            <TabsTrigger value="top" className="text-xs">Top</TabsTrigger>
            <TabsTrigger value="rfm" className="text-xs">RFM</TabsTrigger>
            <TabsTrigger value="graph" className="text-xs">Graph</TabsTrigger>
            <TabsTrigger value="loyalty" className="text-xs">Loyalty</TabsTrigger>
          </TabsList>

          {/* TOP merchants */}
          <TabsContent value="top" className="space-y-2 mt-3">
            {filtered.slice(0, 6).map((m, i) => {
              const TI = trendIcons[m.trend];
              const meta = segmentMeta[m.segment];
              const SegIcon = meta.icon;
              return (
                <motion.div
                  key={m.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border/40 bg-muted/20 p-3 hover:border-primary/30 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br shadow-lg shrink-0',
                      colorFromName(m.name),
                    )}>
                      {initials(m.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm truncate">{m.name}</h4>
                        <Badge variant="outline" className={cn('text-[9px] gap-0.5 px-1.5', meta.color)}>
                          <SegIcon className="h-2.5 w-2.5" /> {meta.label}
                        </Badge>
                        <span className={cn('inline-flex items-center gap-0.5 text-[10px]', trendColors[m.trend])}>
                          <TI className="h-3 w-3" /> {m.trend}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-2 text-[10px]">
                        <div>
                          <div className="text-muted-foreground">Spent</div>
                          <div className="font-semibold tabular-nums">{formatCurrency(m.totalSpent)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Ticket</div>
                          <div className="font-semibold tabular-nums">{formatCurrency(m.avgTicket)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cadence</div>
                          <div className="font-semibold tabular-nums">
                            {m.meanInterval > 0 ? `${Math.round(m.meanInterval)}d` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">CLV 12m</div>
                          <div className="font-semibold tabular-nums text-income">{formatCurrency(m.clv12m)}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>Churn risk</span>
                            <span className="tabular-nums">{Math.round(m.churnRisk * 100)}%</span>
                          </div>
                          <Progress value={m.churnRisk * 100} className={cn('h-1 mt-0.5', m.churnRisk > 0.6 && '[&>div]:bg-expense')} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>Retention 90d</span>
                            <span className="tabular-nums">{Math.round(m.retention90d * 100)}%</span>
                          </div>
                          <Progress value={m.retention90d * 100} className="h-1 mt-0.5 [&>div]:bg-income" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 min-w-0">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            Last {format(parseISO(m.lastVisit), 'MMM d')}
                            {m.nextVisitEtaDays != null && m.nextVisitWindow && (
                              <> · Next ~{Math.round(m.nextVisitEtaDays)}d
                                <span className="text-muted-foreground/70"> ({Math.round(m.nextVisitWindow[0])}–{Math.round(m.nextVisitWindow[1])}d)</span>
                              </>
                            )}
                          </span>
                        </div>
                        <Sparkline data={m.monthlySparkline} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </TabsContent>

          {/* RFM scatter */}
          <TabsContent value="rfm" className="mt-3">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, bottom: 16, left: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 2" />
                  <XAxis
                    type="number" dataKey="x" name="Days since last"
                    tick={{ fontSize: 9 }} reversed
                    label={{ value: 'Recency (days ago)', position: 'bottom', offset: 0, fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Visits"
                    tick={{ fontSize: 9 }}
                    label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <RTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any, k: string) => k === 'z' ? formatCurrency(v) : v}
                    labelFormatter={() => ''}
                  />
                  <Scatter data={rfmScatter}>
                    {rfmScatter.map((p, i) => {
                      const c =
                        p.segment === 'Champion' ? 'hsl(var(--income))' :
                        p.segment === 'Loyal' ? 'hsl(var(--primary))' :
                        p.segment === 'AtRisk' ? 'hsl(var(--warning))' :
                        p.segment === 'Lost' ? 'hsl(var(--expense))' : 'hsl(var(--muted-foreground))';
                      return <Cell key={i} fill={c} fillOpacity={0.7} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[110px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentChart}>
                  <XAxis dataKey="segment" tick={{ fontSize: 9 }} />
                  <YAxis hide />
                  <RTooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {segmentChart.map((s, i) => {
                      const c =
                        s.segment === 'Champion' ? 'hsl(var(--income))' :
                        s.segment === 'Loyal' ? 'hsl(var(--primary))' :
                        s.segment === 'AtRisk' ? 'hsl(var(--warning))' :
                        s.segment === 'Lost' ? 'hsl(var(--expense))' : 'hsl(var(--muted-foreground))';
                      return <Cell key={i} fill={c} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              Bubble size = monetary value · Color = segment · X reversed (recent on right)
            </p>
          </TabsContent>

          {/* GRAPH co-visits */}
          <TabsContent value="graph" className="mt-3">
            {report.topRelationships.length === 0 ? (
              <div className="text-center py-8">
                <Network className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No strong co-visit patterns yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {report.topRelationships.map((r, i) => (
                  <motion.div
                    key={`${r.merchant}-${r.partner}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-lg border border-border/40 bg-muted/20 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={cn('h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shrink-0', colorFromName(r.merchant))}>
                          {initials(r.merchant)}
                        </div>
                        <Network className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className={cn('h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shrink-0', colorFromName(r.partner))}>
                          {initials(r.partner)}
                        </div>
                        <div className="text-xs min-w-0">
                          <div className="font-medium truncate">{r.merchant} ↔ {r.partner}</div>
                          <div className="text-[10px] text-muted-foreground">Jaccard {r.weight.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="w-16 h-1.5 rounded-full bg-muted/40 overflow-hidden shrink-0">
                        <div className="h-full bg-primary" style={{ width: `${r.weight * 100}%` }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* LOYALTY */}
          <TabsContent value="loyalty" className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
                <div className="text-[9px] uppercase text-muted-foreground">HHI</div>
                <div className="text-lg font-bold tabular-nums">{(report.loyaltyHHI * 10000).toFixed(0)}</div>
                <div className="text-[9px] text-muted-foreground">Concentration</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
                <div className="text-[9px] uppercase text-muted-foreground">Diversity</div>
                <div className="text-lg font-bold tabular-nums text-primary">{Math.round(report.diversityIndex * 100)}%</div>
                <div className="text-[9px] text-muted-foreground">1 − HHI</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
                <div className="text-[9px] uppercase text-muted-foreground">Lifetime</div>
                <div className="text-lg font-bold tabular-nums">{formatCurrency(report.totalLifetime)}</div>
                <div className="text-[9px] text-muted-foreground">All merchants</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Wallet share (top 8)
              </div>
              <div className="space-y-1">
                {report.merchants.slice(0, 8).map(m => (
                  <div key={m.key} className="flex items-center gap-2">
                    <span className="text-[11px] w-28 truncate">{m.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m.share * 100}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-12 text-right">
                      {(m.share * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/40">
              Median recency {Math.round(report.dna.recencyMedian)}d ·
              Median visits {Math.round(report.dna.frequencyMedian)} ·
              Median spend {formatCurrency(report.dna.monetaryMedian)}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
