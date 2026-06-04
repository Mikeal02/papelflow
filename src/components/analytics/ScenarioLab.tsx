import { useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Play, Sliders, TrendingUp, AlertTriangle, Target, Activity, Zap, Gauge, Compass, Wand2, ShieldAlert } from 'lucide-react';
import {
  Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Bar, BarChart, Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import {
  runScenarioLab, DEFAULT_SCENARIO_INPUTS, runSensitivityAnalysis, optimizeContribution,
  findSafeWithdrawalRate, analyzeSequenceRisk, sampleTrajectories,
  type ScenarioInputs, type ScenarioReport, type SensitivityReport, type OptimizerResult,
  type WithdrawalReport, type SequenceRiskReport,
} from '@/lib/intelligence/scenarioLab';
import { cn } from '@/lib/utils';


function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  display?: (v: number) => string;
}

function SliderRow({ label, value, min, max, step, suffix, onChange, display }: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold tabular-nums">
          {display ? display(value) : value}{suffix || ''}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

export function ScenarioLab() {
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const [isPending, startTransition] = useTransition();

  // Seed defaults from real data
  const seeded = useMemo<ScenarioInputs>(() => {
    const balance = accounts.reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
    const monthlyIncome = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((s: number, t: any) => s + Number(t.amount), 0) / Math.max(1, Math.min(3, Math.ceil(transactions.length / 30)));
    const monthlyExpenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((s: number, t: any) => s + Number(t.amount), 0) / Math.max(1, Math.min(3, Math.ceil(transactions.length / 30)));

    return {
      ...DEFAULT_SCENARIO_INPUTS,
      startingNetWorth: balance > 0 ? balance : DEFAULT_SCENARIO_INPUTS.startingNetWorth,
      monthlyIncome: monthlyIncome > 0 ? Math.round(monthlyIncome) : DEFAULT_SCENARIO_INPUTS.monthlyIncome,
      monthlyExpenses: monthlyExpenses > 0 ? Math.round(monthlyExpenses) : DEFAULT_SCENARIO_INPUTS.monthlyExpenses,
    };
  }, [accounts, transactions]);

  const [inputs, setInputs] = useState<ScenarioInputs>(seeded);
  const [report, setReport] = useState<ScenarioReport | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityReport | null>(null);
  const [optimizer, setOptimizer] = useState<OptimizerResult | null>(null);
  const [withdrawal, setWithdrawal] = useState<WithdrawalReport | null>(null);
  const [sequence, setSequence] = useState<SequenceRiskReport | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<{ name: string; report: ScenarioReport; inputs: ScenarioInputs }[]>([]);

  const update = <K extends keyof ScenarioInputs>(k: K, v: ScenarioInputs[K]) =>
    setInputs(prev => ({ ...prev, [k]: v }));

  const handleRun = () => {
    startTransition(() => {
      const r = runScenarioLab(inputs);
      setReport(r);
      // Reset derived analyses on a fresh run
      setSensitivity(null); setOptimizer(null); setWithdrawal(null); setSequence(null);
    });
  };

  const handleSensitivity = () => startTransition(() => setSensitivity(runSensitivityAnalysis(inputs, 500)));
  const handleOptimize = () => startTransition(() => setOptimizer(optimizeContribution(inputs, 0.8, 500, 12)));
  const handleWithdrawal = () => startTransition(() => {
    if (!report) return;
    setWithdrawal(findSafeWithdrawalRate(report.endpointP50, inputs, 30, 0.95, 700));
  });
  const handleSequence = () => startTransition(() => setSequence(analyzeSequenceRisk(inputs, 600)));
  const handleSave = () => {
    if (!report) return;
    setSavedScenarios(prev => [...prev, { name: `Scenario ${prev.length + 1}`, report, inputs: { ...inputs } }].slice(-4));
  };

  const spaghetti = useMemo(() => report ? sampleTrajectories(inputs, 6) : [], [report, inputs]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.bands.map(b => {
      const yr = (b.month / 12).toFixed(1);
      const row: any = { year: yr, p5: Math.round(b.p5), p25: Math.round(b.p25), p50: Math.round(b.p50), p75: Math.round(b.p75), p95: Math.round(b.p95) };
      // Attach spaghetti paths by month
      for (let k = 0; k < 6; k++) {
        const found = spaghetti.find(s => s.path === k && s.month === b.month);
        if (found) row['s' + k] = found.value;
      }
      return row;
    });
  }, [report, spaghetti]);


  return (
    <Card className="elite-card overflow-hidden">
      {/* Header */}
      <div className="mesh-bg relative p-5 border-b border-border/30">
        <div className="absolute inset-0 noise-overlay opacity-30 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="conic-ring rounded-xl p-[1px]">
              <div className="h-11 w-11 rounded-xl bg-card/80 backdrop-blur-md flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight holo-ticker">Scenario Lab</h2>
              <p className="text-xs text-muted-foreground">
                Monte Carlo wealth simulator · {inputs.iterations.toLocaleString()} trajectories · 6 stress tests
              </p>
            </div>
          </div>
          <Button onClick={handleRun} disabled={isPending} className="gap-2">
            <Play className="h-4 w-4" />
            {isPending ? 'Simulating...' : report ? 'Re-run' : 'Run Simulation'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px,1fr] divide-y lg:divide-y-0 lg:divide-x divide-border/30">
        {/* Controls */}
        <div className="p-5 space-y-5 max-h-[640px] overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sliders className="h-3.5 w-3.5" /> Parameters
          </div>

          <div className="space-y-4">
            <SliderRow label="Starting net worth" value={inputs.startingNetWorth} min={0} max={2_000_000} step={1000}
              onChange={v => update('startingNetWorth', v)} display={fmt} />
            <SliderRow label="Monthly income" value={inputs.monthlyIncome} min={0} max={50_000} step={100}
              onChange={v => update('monthlyIncome', v)} display={fmt} />
            <SliderRow label="Monthly expenses" value={inputs.monthlyExpenses} min={0} max={50_000} step={100}
              onChange={v => update('monthlyExpenses', v)} display={fmt} />
            <SliderRow label="Monthly contribution" value={inputs.monthlyContribution} min={0} max={20_000} step={50}
              onChange={v => update('monthlyContribution', v)} display={fmt} />
            <SliderRow label="Wealth target" value={inputs.wealthTarget} min={10_000} max={10_000_000} step={5000}
              onChange={v => update('wealthTarget', v)} display={fmt} />
            <SliderRow label="Horizon (months)" value={inputs.horizonMonths} min={12} max={480} step={6}
              onChange={v => update('horizonMonths', v)} suffix="m" />
          </div>

          <div className="pt-2 border-t border-border/30 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Market</div>
            <SliderRow label="Expected return (annual)" value={inputs.expectedReturnAnnual} min={-0.05} max={0.2} step={0.005}
              onChange={v => update('expectedReturnAnnual', v)} display={v => `${(v * 100).toFixed(1)}%`} />
            <SliderRow label="Return volatility" value={inputs.returnVolatilityAnnual} min={0.01} max={0.5} step={0.01}
              onChange={v => update('returnVolatilityAnnual', v)} display={v => `${(v * 100).toFixed(0)}%`} />
            <SliderRow label="Inflation (annual)" value={inputs.inflationAnnual} min={0} max={0.15} step={0.005}
              onChange={v => update('inflationAnnual', v)} display={v => `${(v * 100).toFixed(1)}%`} />
            <SliderRow label="Income growth (annual)" value={inputs.incomeGrowthAnnual} min={0} max={0.15} step={0.005}
              onChange={v => update('incomeGrowthAnnual', v)} display={v => `${(v * 100).toFixed(1)}%`} />
            <SliderRow label="Tax rate on returns" value={inputs.taxRateOnReturns} min={0} max={0.5} step={0.01}
              onChange={v => update('taxRateOnReturns', v)} display={v => `${(v * 100).toFixed(0)}%`} />
          </div>

          <div className="pt-2 border-t border-border/30 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tail Risk</div>
            <SliderRow label="Black-swan probability/yr" value={inputs.blackSwanAnnualProb} min={0} max={0.3} step={0.01}
              onChange={v => update('blackSwanAnnualProb', v)} display={v => `${(v * 100).toFixed(0)}%`} />
            <SliderRow label="Black-swan magnitude" value={inputs.blackSwanMagnitude} min={0.05} max={0.6} step={0.01}
              onChange={v => update('blackSwanMagnitude', v)} display={v => `-${(v * 100).toFixed(0)}%`} />
            <SliderRow label="Iterations" value={inputs.iterations} min={500} max={10000} step={500}
              onChange={v => update('iterations', v)} />
          </div>
        </div>

        {/* Results */}
        <div className="p-5">
          {!report ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <div className="conic-ring rounded-2xl p-[1px] mb-4">
                <div className="h-16 w-16 rounded-2xl bg-card/80 backdrop-blur-md flex items-center justify-center">
                  <Activity className="h-7 w-7 text-primary" />
                </div>
              </div>
              <h3 className="text-base font-semibold">Run a simulation</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Adjust parameters on the left, then run {inputs.iterations.toLocaleString()} Monte Carlo trajectories
                across {(inputs.horizonMonths / 12).toFixed(0)} years.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="forecast" className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <TabsList className="grid grid-cols-5 max-w-2xl">
                  <TabsTrigger value="forecast">Forecast</TabsTrigger>
                  <TabsTrigger value="stress">Stress</TabsTrigger>
                  <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
                  <TabsTrigger value="optimize">Optimize</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                </TabsList>
                <Button size="sm" variant="outline" onClick={handleSave} className="gap-1.5 text-xs h-7">
                  <Wand2 className="h-3 w-3" /> Snapshot
                </Button>
              </div>

              {/* FORECAST */}
              <TabsContent value="forecast" className="space-y-4 m-0">
                {/* Headline */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <HeroStat label="Median endpoint" value={fmt(report.endpointP50)} icon={<Target className="h-3.5 w-3.5" />} />
                  <HeroStat
                    label="Success P(≥ target)"
                    value={`${(report.successProbability * 100).toFixed(0)}%`}
                    intent={report.successProbability >= 0.7 ? 'success' : report.successProbability >= 0.4 ? 'warning' : 'danger'}
                  />
                  <HeroStat label="Years to target (median)" value={report.yearsToTarget !== null ? `${report.yearsToTarget.toFixed(1)}y` : '—'} />
                  <HeroStat
                    label="Ruin probability"
                    value={`${(report.ruinProbability * 100).toFixed(1)}%`}
                    intent={report.ruinProbability < 0.05 ? 'success' : report.ruinProbability < 0.2 ? 'warning' : 'danger'}
                  />
                </div>

                {/* Fan chart */}
                <div className="h-64 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="band95" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="band50" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tickFormatter={(v) => fmt(Number(v))} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={60} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => fmt(v)}
                        labelFormatter={(l) => `Year ${l}`}
                      />
                      <ReferenceLine y={inputs.wealthTarget} stroke="hsl(var(--accent))" strokeDasharray="3 3" label={{ value: 'Target', fill: 'hsl(var(--accent))', fontSize: 10, position: 'right' }} />
                      <Area type="monotone" dataKey="p95" stroke="hsl(var(--primary))" strokeOpacity={0.3} fillOpacity={1} fill="url(#band95)" />
                      <Area type="monotone" dataKey="p75" stroke="hsl(var(--primary))" strokeOpacity={0.5} fillOpacity={1} fill="url(#band50)" />
                      <Area type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2} fill="none" />
                      <Area type="monotone" dataKey="p25" stroke="hsl(var(--primary))" strokeOpacity={0.5} fill="none" />
                      <Area type="monotone" dataKey="p5"  stroke="hsl(var(--primary))" strokeOpacity={0.3} fill="none" />
                      {[0,1,2,3,4,5].map(k => (
                        <Area key={k} type="monotone" dataKey={`s${k}`} stroke="hsl(var(--accent))" strokeOpacity={0.35} strokeWidth={1} fill="none" dot={false} isAnimationActive={false} connectNulls />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Distribution table */}
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { l: 'P5', v: report.endpointP5 },
                    { l: 'P25', v: report.endpointP25 },
                    { l: 'P50', v: report.endpointP50 },
                    { l: 'P75', v: report.endpointP75 },
                    { l: 'P95', v: report.endpointP95 },
                  ].map(d => (
                    <div key={d.l} className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.l}</div>
                      <div className="text-sm font-mono font-semibold tabular-nums mt-0.5">{fmt(d.v)}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* STRESS */}
              <TabsContent value="stress" className="space-y-3 m-0">
                <p className="text-xs text-muted-foreground">
                  Each stress test re-runs ~25% iterations with mutated assumptions. Delta = endpoint vs base.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {report.stressTests.map((s, i) => {
                    const positive = s.delta >= 0;
                    return (
                      <motion.div
                        key={s.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          'rounded-xl border p-3 bg-card/60 backdrop-blur-sm',
                          positive ? 'border-income/30' : 'border-expense/30'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {positive ? <TrendingUp className="h-3.5 w-3.5 text-income" /> : <AlertTriangle className="h-3.5 w-3.5 text-expense" />}
                            <span className="text-sm font-semibold">{s.name}</span>
                          </div>
                          <Badge variant={positive ? 'default' : 'destructive'} className="text-[10px]">
                            {positive ? '+' : ''}{fmt(s.delta)}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-snug">{s.description}</div>
                        <div className="flex items-center justify-between mt-2 text-[11px]">
                          <span className="text-muted-foreground">Endpoint P50</span>
                          <span className="font-mono tabular-nums font-medium">{fmt(s.endpointP50)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Success</span>
                          <span className="font-mono tabular-nums font-medium">{(s.successProb * 100).toFixed(0)}%</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* METRICS */}
              <TabsContent value="metrics" className="space-y-3 m-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Metric label="Best case (P99)" value={fmt(report.bestCase)} />
                  <Metric label="Worst case (P1)" value={fmt(report.worstCase)} />
                  <Metric label="Expected shortfall" value={fmt(report.expectedShortfall)} />
                  <Metric label="Median max drawdown" value={`${(report.maxDrawdownMedian * 100).toFixed(1)}%`} />
                  <Metric label="Sharpe proxy" value={report.sharpeProxy.toFixed(2)} />
                  <Metric label="Compute time" value={`${report.durationMs}ms`} />
                </div>
                <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-3 text-xs leading-relaxed text-muted-foreground">
                  <div className="flex items-center gap-1.5 mb-1.5 text-foreground font-semibold">
                    <Zap className="h-3.5 w-3.5 text-primary" /> How this works
                  </div>
                  Each trajectory simulates income (lognormal shocks + growth), expenses (CPI + behavioral shocks),
                  investment returns (GBM with μ={(inputs.expectedReturnAnnual * 100).toFixed(1)}% σ={(inputs.returnVolatilityAnnual * 100).toFixed(0)}%),
                  taxes on positive returns, and Poisson-sampled black-swan events. Stress tests mutate
                  parameters and re-simulate.
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </Card>
  );
}

function HeroStat({ label, value, intent = 'neutral', icon }: { label: string; value: string; intent?: 'success' | 'warning' | 'danger' | 'neutral'; icon?: React.ReactNode }) {
  const intentClass = {
    success: 'text-income',
    warning: 'text-warning',
    danger: 'text-expense',
    neutral: 'text-foreground',
  }[intent];
  return (
    <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm p-3 shine-sweep">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className={cn('mt-1 text-lg font-bold tabular-nums font-mono', intentClass)}>{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-mono font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}
