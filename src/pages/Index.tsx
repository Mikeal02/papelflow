import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { BudgetOverview } from '@/components/dashboard/BudgetOverview';
import { TopCategories } from '@/components/dashboard/TopCategories';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { AccountsOverview } from '@/components/dashboard/AccountsOverview';
import { UpcomingBills } from '@/components/dashboard/UpcomingBills';
import { getMonthlyStats } from '@/lib/mock-data';

const Dashboard = () => {
  const stats = getMonthlyStats();

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
            <h1 className="text-3xl font-bold">Good morning, Alex</h1>
            <p className="text-muted-foreground mt-1">
              Here's your financial overview for January 2026
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Income"
            value={`$${stats.income.toLocaleString()}`}
            change={12.5}
            icon={TrendingUp}
            iconColor="bg-income/10 text-income"
            delay={0.05}
          />
          <StatCard
            title="Total Expenses"
            value={`$${stats.expenses.toLocaleString()}`}
            change={-3.2}
            icon={TrendingDown}
            iconColor="bg-expense/10 text-expense"
            delay={0.1}
          />
          <StatCard
            title="Net Cash Flow"
            value={`$${stats.netFlow.toLocaleString()}`}
            change={28.3}
            icon={Scale}
            iconColor="bg-primary/10 text-primary"
            delay={0.15}
          />
          <StatCard
            title="Budget Remaining"
            value={`$${(stats.totalBudget - stats.totalSpent).toLocaleString()}`}
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
