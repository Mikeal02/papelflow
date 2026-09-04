import { lazy, Suspense, memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Scale } from "lucide-react";

import { StatCard } from "@/components/dashboard/StatCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { PageTransition } from "@/components/layout/PageTransition";
import { DashboardSkeleton } from "@/components/ui/elite-skeleton";
import { Deferred, WidgetPlaceholder } from "@/components/ui/deferred";
import { useMonthlyStats, useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useBillReminders } from "@/hooks/useBillReminders";
import { useRealtimeTransactions } from "@/hooks/useRealtimeTransactions";

const SmartNudges = lazy(() =>
  import("@/components/dashboard/SmartNudges").then((m) => ({
    default: m.SmartNudges,
  })),
);
const SmartTransactionEntry = lazy(() =>
  import("@/components/transactions/SmartTransactionEntry").then((m) => ({
    default: m.SmartTransactionEntry,
  })),
);
const NetWorthMini = lazy(() =>
  import("@/components/dashboard/NetWorthMini").then((m) => ({
    default: m.NetWorthMini,
  })),
);
const SmartInsights = lazy(() =>
  import("@/components/insights/SmartInsights").then((m) => ({
    default: m.SmartInsights,
  })),
);
const MoneyFlowSankey = lazy(() =>
  import("@/components/dashboard/MoneyFlowSankey").then((m) => ({
    default: m.MoneyFlowSankey,
  })),
);
const CashFlowChart = lazy(() =>
  import("@/components/dashboard/CashFlowChart").then((m) => ({
    default: m.CashFlowChart,
  })),
);
const SavingsRateGauge = lazy(() =>
  import("@/components/dashboard/SavingsRateGauge").then((m) => ({
    default: m.SavingsRateGauge,
  })),
);
const BudgetOverview = lazy(() =>
  import("@/components/dashboard/BudgetOverview").then((m) => ({
    default: m.BudgetOverview,
  })),
);
const TopCategories = lazy(() =>
  import("@/components/dashboard/TopCategories").then((m) => ({
    default: m.TopCategories,
  })),
);
const FinancialCalendar = lazy(() =>
  import("@/components/dashboard/FinancialCalendar").then((m) => ({
    default: m.FinancialCalendar,
  })),
);
const SpendingForecast = lazy(() =>
  import("@/components/dashboard/SpendingForecast").then((m) => ({
    default: m.SpendingForecast,
  })),
);
const FinancialHealthScore = lazy(() =>
  import("@/components/dashboard/FinancialHealthScore").then((m) => ({
    default: m.FinancialHealthScore,
  })),
);
const AISpendingInsights = lazy(() =>
  import("@/components/dashboard/AISpendingInsights").then((m) => ({
    default: m.AISpendingInsights,
  })),
);
const SpendingHeatmapCalendar = lazy(() =>
  import("@/components/dashboard/SpendingHeatmapCalendar").then((m) => ({
    default: m.SpendingHeatmapCalendar,
  })),
);
const WhatIfScenario = lazy(() =>
  import("@/components/dashboard/WhatIfScenario").then((m) => ({
    default: m.WhatIfScenario,
  })),
);
const FutureYouSimulator = lazy(() =>
  import("@/components/dashboard/FutureYouSimulator").then((m) => ({
    default: m.FutureYouSimulator,
  })),
);
const GoalsMini = lazy(() =>
  import("@/components/dashboard/GoalsMini").then((m) => ({
    default: m.GoalsMini,
  })),
);
const DailySpendingTracker = lazy(() =>
  import("@/components/dashboard/DailySpendingTracker").then((m) => ({
    default: m.DailySpendingTracker,
  })),
);
const SpendingByTimeOfDay = lazy(() =>
  import("@/components/dashboard/SpendingByTimeOfDay").then((m) => ({
    default: m.SpendingByTimeOfDay,
  })),
);
const AccountsOverview = lazy(() =>
  import("@/components/dashboard/AccountsOverview").then((m) => ({
    default: m.AccountsOverview,
  })),
);
const CurrencyConverter = lazy(() =>
  import("@/components/dashboard/CurrencyConverter").then((m) => ({
    default: m.CurrencyConverter,
  })),
);
const UpcomingBills = lazy(() =>
  import("@/components/dashboard/UpcomingBills").then((m) => ({
    default: m.UpcomingBills,
  })),
);
const FinancialAdvisor = lazy(() =>
  import("@/components/ai/FinancialAdvisor").then((m) => ({
    default: m.FinancialAdvisor,
  })),
);

const WidgetFallback = memo(() => <WidgetPlaceholder />);
WidgetFallback.displayName = "WidgetFallback";

const SectionHeader = memo(
  ({
    index,
    title,
    description,
  }: {
    index: string;
    title: string;
    description?: string;
  }) => (
    <div className="mb-4 flex items-center gap-3">
      <span
        aria-hidden
        className="text-[10px] font-medium tabular-nums tracking-[0.2em] text-muted-foreground/40"
      >
        {index}
      </span>
      <span
        aria-hidden
        className="h-px w-4 shrink-0 bg-border"
      />
      <div className="min-w-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground/55">
            {description}
          </p>
        )}
      </div>
      <span aria-hidden className="section-rule" />
    </div>
  ),
);

SectionHeader.displayName = "SectionHeader";

/** Staggered editorial entrance for each dashboard section. Pure transform +
 * opacity so it stays at 60fps and respects reduced-motion via the global
 * motion config. */
const FadeSection = memo(
  ({
    children,
    delay = 0,
    className = "",
  }: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
  }) => (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`min-w-0 ${className}`}
    >
      {children}
    </motion.section>
  ),
);

FadeSection.displayName = "FadeSection";

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useMonthlyStats();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();

  useRecurringTransactions();
  useBillReminders();
  useRealtimeTransactions();

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + Number(acc.balance ?? 0), 0),
    [accounts],
  );

  // Show the skeleton until the core datasets are all settled. Previously this
  // used `&&`, so the page painted with zeroed metrics the moment any single
  // query resolved and then visibly re-flowed.
  const isInitialLoading = statsLoading || accountsLoading || txLoading;

  return (
    <>
      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : (
        <PageTransition>
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-10">
            <WelcomeHeader />

            {/* Key Metrics */}
            <div>
              <div className="grid gap-2.5 sm:gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Income"
                  value={formatCurrency(stats?.income || 0)}
                  icon={TrendingUp}
                  iconColor="bg-income/8 text-income"
                  delay={0.05}
                  autoCompare="income"
                />
                <StatCard
                  title="Total Expenses"
                  value={formatCurrency(stats?.expenses || 0)}
                  icon={TrendingDown}
                  iconColor="bg-expense/8 text-expense"
                  delay={0.1}
                  autoCompare="expense"
                />
                <StatCard
                  title="Net Cash Flow"
                  value={formatCurrency(stats?.netFlow || 0, true)}
                  icon={Scale}
                  iconColor="bg-primary/8 text-primary"
                  delay={0.15}
                  autoCompare="net"
                />
                <StatCard
                  title="Total Balance"
                  value={formatCurrency(totalBalance)}
                  icon={Wallet}
                  iconColor="bg-accent/8 text-accent"
                  delay={0.2}
                />
              </div>
            </div>
            <Suspense fallback={null}>
              <SmartNudges />
            </Suspense>

            <FadeSection delay={0.08}>
              <QuickStats />
            </FadeSection>

            {/* Insights & Net Worth — first fold, load eagerly */}
            <FadeSection delay={0.12}>
              <SectionHeader
                index="01"
                title="Wealth Overview"
                description="Net worth trajectory and what's driving it"
              />
              <Suspense
                fallback={
                  <div className="bento">
                    <div className="bento-8">
                      <WidgetFallback />
                    </div>
                    <div className="bento-4">
                      <WidgetFallback />
                    </div>
                  </div>
                }
              >
                <div className="bento">
                  <div className="bento-8">
                    <NetWorthMini />
                  </div>
                  {transactions.length > 0 && (
                    <div className="bento-4">
                      <SmartInsights
                        transactions={transactions}
                        categories={categories}
                        formatCurrency={formatCurrency}
                      />
                    </div>
                  )}
                </div>
              </Suspense>
            </FadeSection>

            {/*
              Everything below the fold is gated on visibility. Mounting all 20+
              code-split widgets at once meant ~20 parallel chunk requests plus
              every widget's mount-time computation competing for the main
              thread during first paint.
            */}
            {/* Activity */}
            <FadeSection className="space-y-6">
              <SectionHeader
                index="02"
                title="Activity"
                description="Cash movement, flow composition, and forecasts"
              />

              <RecentTransactions />

              <Deferred fallback={<WidgetFallback />}>
                <MoneyFlowSankey />
              </Deferred>

              <div className="bento">
                <Deferred fallback={<WidgetFallback />} className="bento-8">
                  <CashFlowChart />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-4">
                  <SavingsRateGauge />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-6">
                  <BudgetOverview />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-6">
                  <TopCategories />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-4">
                  <FinancialCalendar />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-8">
                  <SpendingForecast />
                </Deferred>
              </div>
            </FadeSection>

            {/* Intelligence */}
            <FadeSection className="space-y-5">
              <SectionHeader
                index="03"
                title="Intelligence"
                description="Health score, AI insights, and simulations"
              />

              <div className="bento">
                <Deferred
                  fallback={<WidgetFallback />}
                  className="bento-5"
                  eager
                >
                  <FinancialHealthScore />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-7">
                  <AISpendingInsights />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-7">
                  <SpendingHeatmapCalendar />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-5">
                  <WhatIfScenario />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-6">
                  <FutureYouSimulator />
                </Deferred>

                <Deferred fallback={<WidgetFallback />} className="bento-6">
                  <GoalsMini />
                </Deferred>
              </div>
            </FadeSection>

            {/* Full-width bottom widgets */}
            <FadeSection>
              <SectionHeader
                index="04"
                title="Tracking & Accounts"
                description="Daily rhythms, account mix, and upcoming obligations"
              />
              <div className="bento">
                <Deferred fallback={<WidgetFallback />} className="bento-4">
                  <DailySpendingTracker />
                </Deferred>
                <Deferred fallback={<WidgetFallback />} className="bento-4">
                  <SpendingByTimeOfDay />
                </Deferred>
                <Deferred fallback={<WidgetFallback />} className="bento-4">
                  <AccountsOverview />
                </Deferred>
                <Deferred fallback={<WidgetFallback />} className="bento-4">
                  <CurrencyConverter />
                </Deferred>
                <Deferred fallback={<WidgetFallback />} className="bento-8">
                  <UpcomingBills />
                </Deferred>
              </div>
            </FadeSection>
          </div>
        </PageTransition>
      )}

      <Suspense fallback={null}>
        <FinancialAdvisor />
      </Suspense>
    </>
  );
};

export default Dashboard;
