import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Scale, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { BudgetOverview } from '@/components/dashboard/BudgetOverview';
import { TopCategories } from '@/components/dashboard/TopCategories';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { AccountsOverview } from '@/components/dashboard/AccountsOverview';
import { UpcomingBills } from '@/components/dashboard/UpcomingBills';
import { SmartInsights } from '@/components/insights/SmartInsights';
import { FinancialHealthScore } from '@/components/dashboard/FinancialHealthScore';
import { FinancialCalendar } from '@/components/dashboard/FinancialCalendar';
import { SpendingForecast } from '@/components/dashboard/SpendingForecast';
import { FinancialAdvisor } from '@/components/ai/FinancialAdvisor';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { SavingsRateGauge } from '@/components/dashboard/SavingsRateGauge';
import { DailySpendingTracker } from '@/components/dashboard/DailySpendingTracker';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { NetWorthMini } from '@/components/dashboard/NetWorthMini';
import { GoalsMini } from '@/components/dashboard/GoalsMini';
import { SpendingByTimeOfDay } from '@/components/dashboard/SpendingByTimeOfDay';
import { PageTransition } from '@/components/layout/PageTransition';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useBillReminders } from '@/hooks/useBillReminders';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useMonthlyStats();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();

  useRecurringTransactions();
  useBillReminders();

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-5 lg:space-y-7">
          {/* Header */}
          <WelcomeHeader />

          {/* Stats Grid */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Income"
              value={formatCurrency(stats?.income || 0)}
              icon={TrendingUp}
              iconColor="bg-gradient-to-br from-income/20 to-income/10 text-income"
              delay={0.05}
              autoCompare="income"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(stats?.expenses || 0)}
              icon={TrendingDown}
              iconColor="bg-gradient-to-br from-expense/20 to-expense/10 text-expense"
              delay={0.1}
              autoCompare="expense"
            />
            <StatCard
              title="Net Cash Flow"
              value={formatCurrency(stats?.netFlow || 0, true)}
              icon={Scale}
              iconColor="bg-gradient-to-br from-primary/20 to-primary/10 text-primary"
              delay={0.15}
              autoCompare="net"
            />
            <StatCard
              title="Total Balance"
              value={formatCurrency(totalBalance)}
              icon={Wallet}
              iconColor="bg-gradient-to-br from-accent/20 to-accent/10 text-accent"
              delay={0.2}
            />
          </div>

          {/* Quick Stats Row */}
          <QuickStats />

          {/* Net Worth Trend + Smart Insights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <NetWorthMini />
            {transactions.length > 0 && (
              <SmartInsights
                transactions={transactions}
                categories={categories}
                formatCurrency={formatCurrency}
              />
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-4 lg:gap-5 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-5">
              <RecentTransactions />
              <div className="grid gap-4 sm:grid-cols-2">
                <CashFlowChart />
                <SavingsRateGauge />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <BudgetOverview />
                <TopCategories />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FinancialCalendar />
                <SpendingForecast />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 lg:space-y-5">
              <FinancialHealthScore />
              <DailySpendingTracker />
              <GoalsMini />
              <SpendingByTimeOfDay />
              <AccountsOverview />
              <UpcomingBills />
            </div>
          </div>
        </div>
      </PageTransition>

      {/* AI Financial Advisor */}
      <FinancialAdvisor />
    </AppLayout>
  );
};

export default Dashboard;
