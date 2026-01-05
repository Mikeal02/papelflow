import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Scale, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { BudgetOverview } from '@/components/dashboard/BudgetOverview';
import { TopCategories } from '@/components/dashboard/TopCategories';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { AccountsOverview } from '@/components/dashboard/AccountsOverview';
import { UpcomingBills } from '@/components/dashboard/UpcomingBills';
import { useMonthlyStats } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useProfile } from '@/hooks/useProfile';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useMonthlyStats();
  const { data: accounts = [] } = useAccounts();
  const { data: profile } = useProfile();

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold">
                {getGreeting()}, <span className="gradient-text">{firstName}</span>
              </h1>
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <p className="text-muted-foreground">
              Here's your financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Income"
            value={`$${(stats?.income || 0).toLocaleString()}`}
            icon={TrendingUp}
            iconColor="bg-income/10 text-income"
            delay={0.05}
          />
          <StatCard
            title="Total Expenses"
            value={`$${(stats?.expenses || 0).toLocaleString()}`}
            icon={TrendingDown}
            iconColor="bg-expense/10 text-expense"
            delay={0.1}
          />
          <StatCard
            title="Net Cash Flow"
            value={`${(stats?.netFlow || 0) >= 0 ? '+' : ''}$${(stats?.netFlow || 0).toLocaleString()}`}
            icon={Scale}
            iconColor="bg-primary/10 text-primary"
            delay={0.15}
          />
          <StatCard
            title="Total Balance"
            value={`$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            icon={Wallet}
            iconColor="bg-chart-3/10 text-chart-3"
            delay={0.2}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5">
            <RecentTransactions />
            <div className="grid gap-5 md:grid-cols-2">
              <BudgetOverview />
              <TopCategories />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            <AccountsOverview />
            <UpcomingBills />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
