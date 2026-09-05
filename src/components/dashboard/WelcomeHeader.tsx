import { motion } from "framer-motion";
import {
  Activity,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useMonthlyStats, useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";

export const WelcomeHeader = memo(function WelcomeHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: stats } = useMonthlyStats();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();
  const firstName =
    profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const {
    greeting,
    emoji,
    currentDate,
    savingsRate,
    streakLabel,
    netWorth,
    txToday,
    topMover,
  } = useMemo(() => {
    const hour = new Date().getHours();
    const isMorning = hour >= 6 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17 && hour < 21;

    const sr =
      stats && stats.income > 0
        ? Math.round(((stats.income - stats.expenses) / stats.income) * 100)
        : 0;

    const today = format(new Date(), "yyyy-MM-dd");
    const todayTx = transactions.filter((t) =>
      t.date?.startsWith(today),
    ).length;
    const nw = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    const monthStart = format(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      "yyyy-MM",
    );
    const byCat: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense" && t.date?.startsWith(monthStart))
      .forEach((t) => {
        const k = (t as any).category?.name || "Other";
        byCat[k] = (byCat[k] || 0) + Number(t.amount);
      });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

    return {
      greeting: isMorning
        ? "Good morning"
        : isAfternoon
          ? "Good afternoon"
          : isEvening
            ? "Good evening"
            : "Good night",
      emoji: isMorning ? "☀️" : isAfternoon ? "🌤️" : isEvening ? "🌅" : "🌙",
      currentDate: format(new Date(), "EEEE, MMMM d"),
      savingsRate: sr,
      streakLabel:
        sr >= 30
          ? "Excellent saver"
          : sr >= 20
            ? "Great progress"
            : sr >= 10
              ? "Building momentum"
              : sr > 0
                ? "Getting started"
                : null,
      netWorth: nw,
      txToday: todayTx,
      topMover: top ? { name: top[0], amount: top[1] } : null,
    };
  }, [stats, accounts, transactions]);

  const tickerItems = [
    {
      label: "Net Worth",
      value: formatCurrency(netWorth),
      icon: Sparkles,
      tone: "primary" as const,
    },
    {
      label: "Income MTD",
      value: formatCurrency(stats?.income || 0),
      icon: TrendingUp,
      tone: "income" as const,
    },
    {
      label: "Expenses MTD",
      value: formatCurrency(stats?.expenses || 0),
      icon: TrendingDown,
      tone: "expense" as const,
    },
    {
      label: "Today",
      value: `${txToday} tx`,
      icon: Zap,
      tone: "accent" as const,
    },
    ...(topMover
      ? [
          {
            label: `Top: ${topMover.name}`,
            value: formatCurrency(topMover.amount),
            icon: Activity,
            tone: "warning" as const,
          },
        ]
      : []),
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      }}
      className="hero-surface"
    >
      <div className="p-5 sm:p-7 lg:p-8">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2.5">
            <p className="eyebrow-bar text-eyebrow">
              <span aria-hidden>{emoji}</span>
              <span>{currentDate}</span>
            </p>
            <h1 className="text-display text-balance">
              {greeting}, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
              Everything in one place — accounts, budgets and goals,
              reconciled in real time.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {stats && stats.income > 20 && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                  savingsRate >= 20
                    ? "border-income/20 bg-income/10 text-income"
                    : savingsRate >= 0
                      ? "border-warning/25 bg-warning/10 text-warning"
                      : "border-expense/20 bg-expense/10 text-expense",
                )}
              >
                <Activity className="h-3.5 w-3.5 shrink-0" />
                <span className="text-numeric">
                  {savingsRate >= 0 ? "+" : ""}
                  {savingsRate}% saved
                </span>
              </div>
            )}
            {streakLabel && savingsRate >= 20 && (
              <span className="pill-quiet hidden sm:inline-flex">
                <Sparkles className="h-3 w-3" />
                {streakLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics rail */}
      <dl className="metric-rail grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {tickerItems.map((it, i) => {
          const toneCls =
            it.tone === "income"
              ? "text-income"
              : it.tone === "expense"
                ? "text-expense"
                : it.tone === "accent"
                  ? "text-accent"
                  : it.tone === "warning"
                    ? "text-warning"
                    : "text-primary";
          return (
            <div
              key={i}
              className="group flex cursor-default flex-col gap-1.5 transition-colors duration-150 hover:bg-muted/25"
            >
              <dt className="flex items-center gap-1.5 text-eyebrow truncate">
                <it.icon className={cn("h-3.5 w-3.5 shrink-0", toneCls)} />
                <span className="truncate">{it.label}</span>
              </dt>
              <dd className="truncate text-[15px] font-semibold tracking-[-0.02em] text-numeric text-foreground">
                {it.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </motion.section>
  );
});

