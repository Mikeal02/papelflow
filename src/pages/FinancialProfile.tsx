import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Target,
  Wallet,
  PiggyBank,
  Percent,
  TrendingUp,
  Trophy,
  Flame,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTransactions, HISTORY_TX_LIMIT } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useGoals } from "@/hooks/useGoals";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

const MONTHS_BACK = 6;

function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
});

const SectionHeader = ({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) => (
  <div className="section-rule flex items-end justify-between gap-4 pb-3">
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
    {action}
  </div>
);

const FinancialProfile = () => {
  const { data: transactions = [], isLoading: txLoading } =
    useTransactions(HISTORY_TX_LIMIT);
  const { data: accounts = [] } = useAccounts();
  const { data: goals = [] } = useGoals();
  const { formatCurrency } = useCurrency();

  const model = useMemo(() => {
    const now = new Date();
    const keys: string[] = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }

    const buckets: Record<string, { income: number; expense: number }> = {};
    keys.forEach((k) => (buckets[k] = { income: 0, expense: 0 }));

    for (const t of transactions) {
      const k = String(t.date).slice(0, 7);
      if (!buckets[k]) continue;
      const amt = Math.abs(Number(t.amount) || 0);
      if (t.type === "income") buckets[k].income += amt;
      else if (t.type === "expense") buckets[k].expense += amt;
    }

    const series = keys.map((k) => ({
      key: k,
      label: monthLabel(k),
      income: buckets[k].income,
      expense: buckets[k].expense,
      net: buckets[k].income - buckets[k].expense,
    }));

    const current = series[series.length - 1] ?? {
      income: 0,
      expense: 0,
      net: 0,
    };
    const previous = series[series.length - 2];

    const observed = series.filter((s) => s.income > 0 || s.expense > 0);
    const avgIncome = observed.length
      ? observed.reduce((s, m) => s + m.income, 0) / observed.length
      : 0;
    const avgExpense = observed.length
      ? observed.reduce((s, m) => s + m.expense, 0) / observed.length
      : 0;

    let assets = 0;
    let liabilities = 0;
    for (const a of accounts) {
      const bal = Number(a.balance) || 0;
      if (a.type === "credit_card" || a.type === "loan")
        liabilities += Math.abs(bal);
      else assets += bal;
    }

    const savingsRate =
      current.income > 0 ? (current.net / current.income) * 100 : 0;
    const runwayMonths = avgExpense > 0 ? assets / avgExpense : 0;

    const goalRows = goals
      .map((g) => {
        const target = Number((g as any).target_amount) || 0;
        const saved = Number((g as any).current_amount) || 0;
        return {
          id: g.id,
          name: (g as any).name as string,
          target,
          saved,
          pct: target > 0 ? Math.min((saved / target) * 100, 100) : 0,
        };
      })
      .sort((a, b) => b.pct - a.pct);

    const goalTarget = goalRows.reduce((s, g) => s + g.target, 0);
    const goalSaved = goalRows.reduce((s, g) => s + g.saved, 0);

    const active = series.filter((s) => s.income > 0 || s.expense > 0);
    const bestMonth = active.length
      ? active.reduce((a, b) => (b.net > a.net ? b : a))
      : null;
    const heaviestMonth = active.length
      ? active.reduce((a, b) => (b.expense > a.expense ? b : a))
      : null;
    const netTrend =
      active.length >= 2
        ? active[active.length - 1].net - active[active.length - 2].net
        : 0;

    return {
      series,
      current,
      previous,
      avgIncome,
      avgExpense,
      assets,
      liabilities,
      netWorth: assets - liabilities,
      savingsRate,
      runwayMonths,
      goalRows,
      goalTarget,
      goalSaved,
      txCount: transactions.length,
      bestMonth,
      heaviestMonth,
      netTrend,
    };
  }, [transactions, accounts, goals]);

  const deltaPct = (curr: number, prev?: number) => {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const stats = [
    {
      label: "Monthly income",
      value: model.current.income,
      icon: ArrowUpRight,
      tone: "text-income",
      delta: deltaPct(model.current.income, model.previous?.income),
      hint: `Avg ${formatCurrency(model.avgIncome)} / mo`,
    },
    {
      label: "Monthly expenses",
      value: model.current.expense,
      icon: ArrowDownRight,
      tone: "text-expense",
      delta: deltaPct(model.current.expense, model.previous?.expense),
      hint: `Avg ${formatCurrency(model.avgExpense)} / mo`,
      invertDelta: true,
    },
    {
      label: "Net worth",
      value: model.netWorth,
      icon: Landmark,
      tone: model.netWorth >= 0 ? "text-primary" : "text-expense",
      delta: null,
      hint: `${formatCurrency(model.assets)} assets · ${formatCurrency(model.liabilities)} debt`,
    },
    {
      label: "Goals funded",
      value: model.goalSaved,
      icon: Target,
      tone: "text-accent",
      delta: null,
      hint:
        model.goalTarget > 0
          ? `${((model.goalSaved / model.goalTarget) * 100).toFixed(0)}% of ${formatCurrency(model.goalTarget)}`
          : "No goals yet",
    },
  ];

  return (
    <div className="space-y-10">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <motion.header
        {...fadeUp(0)}
        className="hero-surface relative overflow-hidden p-6 sm:p-10"
      >
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Financial Profile
            </p>
            <h1 className="text-display text-3xl sm:text-4xl mt-3">
              Your complete money picture
            </h1>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Built live from{" "}
              <span className="text-foreground font-medium tabular-nums">
                {model.txCount}
              </span>{" "}
              transactions,{" "}
              <span className="text-foreground font-medium tabular-nums">
                {accounts.length}
              </span>{" "}
              accounts and{" "}
              <span className="text-foreground font-medium tabular-nums">
                {goals.length}
              </span>{" "}
              goals.
            </p>
          </div>

          {/* Hero metric rail */}
          <div className="metric-rail grid grid-cols-2 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Percent className="h-3 w-3" /> Savings rate
              </div>
              <p
                className={cn(
                  "figure-xl mt-2",
                  model.savingsRate >= 0 ? "text-income" : "text-expense",
                )}
              >
                {model.savingsRate.toFixed(0)}%
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <PiggyBank className="h-3 w-3" /> Runway
              </div>
              <p className="figure-xl mt-2">
                {model.runwayMonths.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  mo
                </span>
              </p>
            </div>
            <div className="px-5 py-4 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Landmark className="h-3 w-3" /> Net worth
              </div>
              <p
                className={cn(
                  "figure-xl mt-2 truncate",
                  model.netWorth >= 0 ? "text-primary" : "text-expense",
                )}
              >
                {formatCurrency(model.netWorth)}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-8 flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/budgets">
              Manage budgets <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/goals">View goals</Link>
          </Button>
        </div>
      </motion.header>

      {/* ── Insights strip ───────────────────────────────────── */}
      {model.bestMonth && (
        <div className="stagger-kinetic grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Trophy,
              tone: "text-income",
              label: "Best month",
              value: `${model.bestMonth.label} · ${model.bestMonth.net >= 0 ? "+" : "−"}${formatCurrency(Math.abs(model.bestMonth.net))}`,
            },
            {
              icon: Flame,
              tone: "text-expense",
              label: "Heaviest spend",
              value: `${model.heaviestMonth?.label} · ${formatCurrency(model.heaviestMonth?.expense ?? 0)}`,
            },
            {
              icon: Activity,
              tone: model.netTrend >= 0 ? "text-income" : "text-expense",
              label: "Net trend",
              value: `${model.netTrend >= 0 ? "Improving" : "Declining"} · ${model.netTrend >= 0 ? "+" : "−"}${formatCurrency(Math.abs(model.netTrend))} MoM`,
            },
          ].map((ins, i) => (
            <motion.div
              key={ins.label}
              {...fadeUp(i + 1)}
              className="stat-card flex items-center gap-3.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                <ins.icon className={cn("h-4 w-4", ins.tone)} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {ins.label}
                </p>
                <p className="text-sm font-semibold tabular-nums truncate mt-0.5">
                  {ins.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Core metrics ─────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Core metrics"
          sub="Current month versus your rolling average"
        />
        <div className="stagger-kinetic grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} {...fadeUp(i)} className="stat-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
                  <s.icon className={cn("h-3.5 w-3.5", s.tone)} />
                </div>
              </div>
              <p
                className="figure-xl mt-4 truncate"
                title={String(s.value)}
              >
                {formatCurrency(s.value)}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                {s.delta !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      (s.invertDelta ? -s.delta : s.delta) >= 0
                        ? "text-income"
                        : "text-expense",
                    )}
                  >
                    {s.delta >= 0 ? "+" : ""}
                    {s.delta.toFixed(1)}%
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground truncate">
                  {s.hint}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Cashflow chart ───────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Income versus expenses"
          sub={`Last ${MONTHS_BACK} months, derived from your transactions`}
        />
        <motion.div {...fadeUp(0)} className="stat-card">
          <div className="flex items-center gap-4 mb-5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-income" /> Income
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-expense" /> Expenses
            </span>
          </div>
          {txLoading ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              Loading your history…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={model.series}>
                <defs>
                  <linearGradient id="fpIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--income))"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--income))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="fpExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--expense))"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--expense))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number, n: string) => [
                    formatCurrency(Number(v)),
                    n,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="hsl(var(--income))"
                  strokeWidth={2}
                  fill="url(#fpIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expenses"
                  stroke="hsl(var(--expense))"
                  strokeWidth={2}
                  fill="url(#fpExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </section>

      {/* ── Balance sheet & goals ────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Balance sheet & goals"
          sub="Accounts drive net worth; goals track progress"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div {...fadeUp(0)} className="stat-card">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold">Accounts</h3>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {accounts.length} linked
              </span>
            </div>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No accounts yet — add one to build your net worth.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {accounts.map((a) => {
                  const isDebt = a.type === "credit_card" || a.type === "loan";
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {String(a.type).replace("_", " ")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums shrink-0",
                          isDebt ? "text-expense" : "text-foreground",
                        )}
                      >
                        {isDebt ? "−" : ""}
                        {formatCurrency(Math.abs(Number(a.balance) || 0))}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between gap-3 pt-3.5">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Net worth
                  </span>
                  <span
                    className={cn(
                      "text-base font-bold tabular-nums",
                      model.netWorth >= 0 ? "text-primary" : "text-expense",
                    )}
                  >
                    {formatCurrency(model.netWorth)}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div {...fadeUp(1)} className="stat-card">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                <h3 className="text-base font-semibold">Goals</h3>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/goals">Open</Link>
              </Button>
            </div>
            {model.goalRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No goals yet — set one to start tracking progress.
              </p>
            ) : (
              <div className="space-y-4">
                {model.goalRows.slice(0, 6).map((g) => (
                  <div key={g.id}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium truncate">
                        {g.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                        {formatCurrency(g.saved)} / {formatCurrency(g.target)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Progress value={g.pct} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground w-8 text-right">
                        {g.pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Cashflow rhythm ──────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          title="Cashflow rhythm"
          sub="Monthly surplus or deficit after every expense"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {model.series.map((m, i) => (
            <motion.div key={m.key} {...fadeUp(i)} className="stat-card">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{m.label}</span>
                <TrendingUp
                  className={cn(
                    "h-4 w-4",
                    m.net >= 0 ? "text-income" : "text-expense rotate-180",
                  )}
                />
              </div>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums mt-3",
                  m.net >= 0 ? "text-income" : "text-expense",
                )}
              >
                {m.net >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(m.net))}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                {formatCurrency(m.income)} in · {formatCurrency(m.expense)} out
              </p>
              {/* mini in/out bar */}
              <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-income/70"
                  style={{
                    width: `${
                      m.income + m.expense > 0
                        ? (m.income / (m.income + m.expense)) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-expense/70"
                  style={{
                    width: `${
                      m.income + m.expense > 0
                        ? (m.expense / (m.income + m.expense)) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FinancialProfile;
