import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Scale, Calendar } from 'lucide-react';
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
  
  // Initialize recurring transactions and bill reminders
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
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's your financial overview
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Income"
            value={formatCurrency(stats?.income || 0)}
            icon={TrendingUp}
            iconColor="bg-income/10 text-income"
            delay={0.05}
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(stats?.expenses || 0)}
            icon={TrendingDown}
            iconColor="bg-expense/10 text-expense"
            delay={0.1}
          />
          <StatCard
            title="Net Cash Flow"
            value={formatCurrency(stats?.netFlow || 0, true)}
            icon={Scale}
            iconColor="bg-primary/10 text-primary"
            delay={0.15}
          />
          <StatCard
            title="Total Balance"
            value={formatCurrency(totalBalance)}
            icon={Wallet}
            iconColor="bg-accent/10 text-accent"
            delay={0.2}
          />
        </div>

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
            <AccountsOverview />
            <UpcomingBills />
          </div>
        </div>
      </div>
      
      {/* AI Financial Advisor Chat */}
      <FinancialAdvisor />
    </AppLayout>
  );
};

export default Dashboard;
