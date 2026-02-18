import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Scale, Calendar, Sparkles } from 'lucide-react';
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
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useBillReminders } from '@/hooks/useBillReminders';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useMonthlyStats();
  const { data: accounts = [] } = useAccounts();
  const { data: profile } = useProfile();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();
  
  useRecurringTransactions();
  useBillReminders();

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric' 
  });

  return (
    <AppLayout>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-2xl md:text-3xl font-bold"
            >
              <span className="gradient-text">{getGreeting()}</span>, {firstName}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground mt-1"
            >
              Here's your financial overview
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/30"
          >
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">{currentDate}</span>
          </motion.div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4">
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

        {/* Smart Insights */}
        {transactions.length > 0 && (
          <SmartInsights
            transactions={transactions}
            categories={categories}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Main Content Grid */}
        <div className="grid gap-5 lg:gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5 lg:space-y-6">
            <RecentTransactions />
            <div className="grid gap-5 sm:grid-cols-2">
              <CashFlowChart />
              <SavingsRateGauge />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <BudgetOverview />
              <TopCategories />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FinancialCalendar />
              <SpendingForecast />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5 lg:space-y-6">
            <FinancialHealthScore />
            <DailySpendingTracker />
            <AccountsOverview />
            <UpcomingBills />
          </div>
        </div>
      </div>
      
      {/* AI Financial Advisor */}
      <FinancialAdvisor />
    </AppLayout>
  );
};

export default Dashboard;
