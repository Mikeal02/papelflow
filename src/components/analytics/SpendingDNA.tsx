import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Dna, Clock, Calendar, Sparkles, AlertCircle, Target, Fingerprint, TrendingUp, GitBranch, Network, Telescope } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransactions } from '@/hooks/useTransactions';
import {
  analyzeSpendingDna, buildMerchantMarkov, analyzeDrift, simulateShadowGenome, forecast30DaySpend,
} from '@/lib/intelligence/spendingDna';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SpendingDNA() {
  const { data: transactions = [] } = useTransactions();
  const report = useMemo(() => analyzeSpendingDna(transactions as any[]), [transactions]);
  const markov = useMemo(() => buildMerchantMarkov(transactions as any[], 8), [transactions]);
  const drift = useMemo(() => analyzeDrift(transactions as any[]), [transactions]);
  const shadow = useMemo(() => simulateShadowGenome(report), [report]);
  const forecast = useMemo(() => forecast30DaySpend(transactions as any[]), [transactions]);

  const radarData = report.genome.map(g => ({
    axis: g.label.split(' ')[0],
    you: Math.round(g.value),
    peer: Math.round(g.benchmark),
  }));

  const shadowRadar = shadow.shadow.map((s, i) => ({
    axis: s.label.split(' ')[0],
    current: Math.round(shadow.current[i].value),
    shadow: Math.round(s.value),
  }));

  return (
    <Card className="elite-card overflow-hidden">
      {/* Header */}
      <div className="mesh-bg relative p-5 border-b border-border/30">
        <div className="absolute inset-0 noise-overlay opacity-30 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="conic-ring rounded-xl p-[1px]">
              <div className="h-11 w-11 rounded-xl bg-card/80 backdrop-blur-md flex items-center justify-center">
                <Dna className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight holo-ticker">Spending DNA</h2>
              <p className="text-xs text-muted-foreground">
                Behavioral fingerprint across 7 orthogonal axes · {report.diagnostics.find(d => d.label === 'Expenses analyzed')?.value || 0} txns analyzed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border/30 bg-card/60 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2">
              <Fingerprint className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Genome</span>
              <span className="font-mono text-xs font-semibold">{report.fingerprint}</span>
            </div>
            <div className={cn(
              'rounded-lg border border-border/30 bg-card/60 backdrop-blur-sm px-3 py-1.5',
              report.overallScore >= 70 ? 'text-income' : report.overallScore >= 50 ? 'text-warning' : 'text-expense'
            )}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</div>
              <div className="text-base font-bold tabular-nums">{Math.round(report.overallScore)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {report.genome.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Not enough expense data yet to compute your DNA.
          </div>
        ) : (
          <Tabs defaultValue="genome" className="space-y-4">
            <TabsList className="grid grid-cols-5 max-w-2xl">
              <TabsTrigger value="genome">Genome</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="predict">Predict</TabsTrigger>
              <TabsTrigger value="evolve">Evolution</TabsTrigger>
              <TabsTrigger value="optimize">Optimize</TabsTrigger>
            </TabsList>

            {/* GENOME */}
            <TabsContent value="genome" className="m-0 space-y-4">
              <div className="grid md:grid-cols-[1fr,1fr] gap-4">
                {/* Radar */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} stroke="hsl(var(--border))" />
                      <Radar name="Peer" dataKey="peer" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeDasharray="3 3" />
                      <Radar name="You" dataKey="you" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Genome bars */}
                <div className="space-y-2.5">
                  {report.genome.map((g, i) => (
                    <motion.div
                      key={g.key}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{g.label}</span>
                        <div className="flex items-center gap-1.5 font-mono tabular-nums">
                          <span className="font-semibold">{Math.round(g.value)}</span>
                          <span className="text-muted-foreground text-[10px]">/ {Math.round(g.benchmark)} peer</span>
                        </div>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="absolute top-0 bottom-0 w-px bg-muted-foreground/40"
                          style={{ left: `${g.benchmark}%` }}
                        />
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${g.value}%` }}
                          transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{g.description}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Archetype blend */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Archetype blend
                </div>
                <div className="space-y-1.5">
                  {report.archetypeBlend.slice(0, 3).map((a, i) => (
                    <div key={a.name} className="flex items-center gap-3">
                      <div className="w-32 text-xs font-medium truncate">{a.name}</div>
                      <Progress value={a.weight * 100} className="h-1.5 flex-1" />
                      <div className="w-10 text-xs font-mono text-right tabular-nums">{(a.weight * 100).toFixed(0)}%</div>
                      {i === 0 && <Badge variant="secondary" className="text-[9px]">Dominant</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* PATTERNS */}
            <TabsContent value="patterns" className="m-0 space-y-4">
              {/* Hour heatmap */}
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  <Clock className="h-3 w-3" /> Hour-of-day intensity
                </div>
                <div className="grid grid-cols-24 gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0,1fr))' }}>
                  {HOURS.map(h => {
                    const v = report.hourHeatmap[h];
                    return (
                      <div key={h} className="aspect-square rounded-sm relative group" style={{
                        background: `hsl(var(--primary) / ${0.08 + v * 0.85})`,
                      }} title={`${h}:00 — ${(v * 100).toFixed(0)}%`}>
                        {h % 6 === 0 && (
                          <div className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-muted-foreground">
                            {h}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day heatmap */}
              <div className="pt-4">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  <Calendar className="h-3 w-3" /> Day-of-week intensity
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((d, i) => {
                    const v = report.dayHeatmap[i];
                    return (
                      <div key={d} className="rounded-lg border border-border/30 bg-card/60 backdrop-blur-sm p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">{d}</div>
                        <div className="mt-1 h-2 rounded-full overflow-hidden bg-muted/40">
                          <div className="h-full bg-gradient-to-r from-primary/60 to-primary" style={{ width: `${v * 100}%` }} />
                        </div>
                        <div className="text-[10px] font-mono mt-1 tabular-nums">{(v * 100).toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Triggers */}
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  <AlertCircle className="h-3 w-3" /> Behavioral triggers
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {report.triggers.map(t => (
                    <div key={t.name} className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 backdrop-blur-sm p-2.5">
                      <Badge variant="secondary" className="text-[9px] capitalize">{t.category}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{t.detail}</div>
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-primary">{(t.strength * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* PREDICT */}
            <TabsContent value="predict" className="m-0 space-y-3">
              <p className="text-xs text-muted-foreground">
                Cadence-based predictions for your most regular merchants. Probability reflects regularity (lower CV → higher confidence).
              </p>
              {report.nextLikely.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Not enough merchant history yet. Need ≥3 transactions per merchant.
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-2.5">
                {report.nextLikely.map((n, i) => (
                  <motion.div
                    key={n.merchant + i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-3 shine-sweep"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold truncate">{n.merchant}</div>
                      <Badge variant={n.probability >= 0.7 ? 'default' : 'secondary'} className="text-[10px]">
                        {(n.probability * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-2">{n.category}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Window</span>
                      <span className="font-mono font-medium">{n.expectedWindow}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-mono font-medium tabular-nums">
                        ${n.expectedAmountLow.toFixed(0)}–${n.expectedAmountHigh.toFixed(0)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">{n.reasoning}</div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* EVOLUTION */}
            <TabsContent value="evolve" className="m-0 space-y-5">
              {/* Drift */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <GitBranch className="h-3 w-3" /> Behavioral drift (first vs second half)
                  </div>
                  {drift.axisDrift.length > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        drift.trajectory === 'improving' && 'text-income',
                        drift.trajectory === 'degrading' && 'text-expense',
                      )}
                    >
                      {drift.trajectory} · ‖Δ‖ {drift.overallDrift.toFixed(1)}
                    </Badge>
                  )}
                </div>
                {drift.axisDrift.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">Need ≥20 transactions to measure drift.</div>
                ) : (
                  <div className="space-y-2">
                    {drift.axisDrift.map(d => {
                      const positive = d.direction === 'up';
                      const flat = d.direction === 'flat';
                      return (
                        <div key={d.key} className="flex items-center gap-3 text-xs">
                          <div className="w-32 truncate font-medium">{d.label}</div>
                          <div className="flex-1 relative h-1.5 rounded-full bg-muted/40 overflow-hidden">
                            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-muted-foreground/40" />
                            <motion.div
                              className={cn(
                                'absolute top-0 bottom-0 rounded-full',
                                flat ? 'bg-muted-foreground/40' : positive ? 'bg-warning/70' : 'bg-income/70'
                              )}
                              style={{
                                left: positive ? '50%' : `${50 - Math.min(50, Math.abs(d.delta) / 2)}%`,
                                width: `${Math.min(50, Math.abs(d.delta) / 2)}%`,
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(50, Math.abs(d.delta) / 2)}%` }}
                            />
                          </div>
                          <div className="w-20 text-right font-mono tabular-nums text-[11px]">
                            {d.before.toFixed(0)} → {d.after.toFixed(0)}
                          </div>
                          <div className={cn('w-12 text-right font-mono tabular-nums font-semibold text-[11px]', flat ? 'text-muted-foreground' : positive ? 'text-warning' : 'text-income')}>
                            {d.delta > 0 ? '+' : ''}{d.delta.toFixed(0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Shadow vs Current */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="h-3 w-3" /> Shadow genome (if recs applied)
                    </div>
                    <Badge variant="secondary" className="text-[10px] text-income">
                      +{shadow.healthGain.toFixed(1)} health · ~${shadow.monthlySavings.toFixed(0)}/mo
                    </Badge>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={shadowRadar}>
                        <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} stroke="hsl(var(--border))" />
                        <Radar name="Current" dataKey="current" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.15} strokeDasharray="3 3" />
                        <Radar name="Shadow" dataKey="shadow" stroke="hsl(var(--income))" fill="hsl(var(--income))" fillOpacity={0.4} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 30d forecast */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Telescope className="h-3 w-3" /> 30-day spend forecast (block bootstrap, 800 sims)
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { l: 'P10', v: forecast.p10, c: 'text-income' },
                      { l: 'P50', v: forecast.p50, c: 'text-foreground' },
                      { l: 'P90', v: forecast.p90, c: 'text-expense' },
                    ].map(d => (
                      <div key={d.l} className="rounded-lg border border-border/30 bg-card/60 backdrop-blur-sm p-2 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.l}</div>
                        <div className={cn('font-mono font-bold tabular-nums mt-0.5', d.c)}>${d.v.toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forecast.byCategory} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                        <XAxis dataKey="category" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-20} textAnchor="end" height={40} />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={36} tickFormatter={v => `$${v}`} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }} formatter={(v: number) => `$${v.toFixed(0)}`} />
                        <Bar dataKey="p50" fill="hsl(var(--primary))" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Markov chain */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Network className="h-3 w-3" /> Merchant Markov chain · entropy {markov.entropyBits.toFixed(2)} bits
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{markov.states.length} states</Badge>
                </div>
                {markov.states.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">Need ≥5 transactions to build the chain.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Next-merchant prediction */}
                    <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Predicted next merchant</div>
                      <div className="space-y-1.5">
                        {markov.predictedNext.map(p => (
                          <div key={p.merchant} className="flex items-center gap-2 text-xs">
                            <div className="w-28 truncate font-medium">{p.merchant}</div>
                            <Progress value={p.probability * 100} className="flex-1 h-1.5" />
                            <div className="w-10 text-right font-mono tabular-nums">{(p.probability * 100).toFixed(0)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top transitions */}
                    <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Strongest transitions</div>
                      <div className="space-y-1">
                        {markov.topTransitions.slice(0, 6).map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className="w-24 truncate text-right text-muted-foreground">{t.from}</span>
                            <span className="text-primary">→</span>
                            <span className="flex-1 truncate font-medium">{t.to}</span>
                            <span className="font-mono tabular-nums text-[10px]">{(t.probability * 100).toFixed(0)}%</span>
                            <Badge variant="secondary" className="text-[9px] tabular-nums">×{t.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stationary distribution */}
                {markov.stationary.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Long-run merchant share (stationary π)</div>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={markov.stationary} layout="vertical" margin={{ top: 0, right: 8, left: 60, bottom: 0 }}>
                          <XAxis type="number" hide tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                          <YAxis type="category" dataKey="merchant" tick={{ fontSize: 9 }} width={80} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                          <Bar dataKey="probability" fill="hsl(var(--accent))" fillOpacity={0.75} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* OPTIMIZE */}
            <TabsContent value="optimize" className="m-0 space-y-3">
              {report.recommendations.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Your spending DNA looks balanced — no high-impact behavioral changes recommended.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {report.recommendations.map((r, i) => (
                    <motion.div
                      key={r.title}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-3.5 shine-sweep"
                    >
                      <div className="conic-ring rounded-lg p-[1px] flex-shrink-0">
                        <div className="h-9 w-9 rounded-lg bg-card/80 backdrop-blur-md flex items-center justify-center">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm">{r.title}</div>
                          <Badge variant="secondary" className="text-[10px] gap-1 flex-shrink-0">
                            <TrendingUp className="h-3 w-3" />
                            ~${r.impactUSD.toFixed(0)}/mo
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.detail}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Diagnostics */}
              <div className="pt-3 border-t border-border/30">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Diagnostics</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {report.diagnostics.map(d => (
                    <div key={d.label} className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-2">
                      <div className="text-[10px] text-muted-foreground">{d.label}</div>
                      <div className="text-xs font-mono font-semibold tabular-nums">{d.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Card>
  );
}
