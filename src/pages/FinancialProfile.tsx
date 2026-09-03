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
  Sparkles,
  Trophy,
  Flame,
  Activity,
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
import { Badge } from "@/components/ui/badge";
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

const SectionHeader = ({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) => (
  <div className="section-rule flex items-end justify-between gap-4 pb-3">
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
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

    // Net worth from account balances: assets minus liabilities.
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
          deadline: (g as any).target_date ?? (g as any).deadline ?? null,
        };
      })
      .sort((a, b) => b.pct - a.pct);

    const goalTarget = goalRows.reduce((s, g) => s + g.target, 0);
    const goalSaved = goalRows.reduce((s, g) => s + g.saved, 0);

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
    <div className="space-y-8">
      <header className="hero-surface p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Financial Profile
        </p>
        <h1 className="text-display text-2xl sm:text-3xl mt-2">
          Your complete money picture
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Built live from {model.txCount} transactions, {accounts.length}{" "}
          accounts and {goals.length} goals.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <Badge variant="secondary" className="gap-1.5">
            <Percent className="h-3 w-3" />
            Savings rate {model.savingsRate.toFixed(0)}%
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <PiggyBank className="h-3 w-3" />
            Runway {model.runwayMonths.toFixed(1)} mo
          </Badge>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/budgets">Manage budgets</Link>
          </Button>
        </div>
      </header>

      <section className="space-y-4">
        <SectionHeader
          title="Core metrics"
          sub="Current month versus your rolling average"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="stat-card"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={cn("h-4 w-4 shrink-0", s.tone)} />
              </div>
              <p className="figure-xl mt-3 truncate" title={String(s.value)}>
                {formatCurrency(s.value)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {s.delta !== null && (
                  <span
                    className={cn(
                      "text-[11px] font-medium tabular-nums",
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

      <section className="space-y-4">
        <SectionHeader
          title="Income versus expenses"
          sub={`Last ${MONTHS_BACK} months, derived from your transactions`}
        />
        <div className="stat-card">
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
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Balance sheet & goals"
          sub="Accounts drive net worth; goals track progress"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Accounts</h3>
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
                <div className="flex items-center justify-between gap-3 pt-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Net worth
                  </span>
                  <span className="text-base font-bold tabular-nums">
                    {formatCurrency(model.netWorth)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="stat-card">
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
                    <Progress value={g.pct} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Cashflow rhythm"
          sub="Monthly surplus or deficit after every expense"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {model.series.map((m) => (
            <div key={m.key} className="stat-card">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{m.label}</span>
                <TrendingUp
                  className={cn(
                    "h-4 w-4",
                    m.net >= 0 ? "text-income" : "text-expense",
                  )}
                />
              </div>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums mt-2",
                  m.net >= 0 ? "text-income" : "text-expense",
                )}
              >
                {m.net >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(m.net))}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {formatCurrency(m.income)} in · {formatCurrency(m.expense)} out
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FinancialProfile;
