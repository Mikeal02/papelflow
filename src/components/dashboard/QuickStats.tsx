import { motion } from 'framer-motion';
import { Zap, CreditCard, Receipt, ArrowUpDown } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMemo } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';

export function QuickStats() {
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: subscriptions = [] } = useSubscriptions();
  const { formatCurrency } = useCurrency();

  const stats = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const txCount = monthTx.length;
    const activeAccounts = accounts.filter(a => a.is_active).length;
    const activeSubs = subscriptions.filter(s => s.is_active).length;
    const monthlySubs = subscriptions
      .filter(s => s.is_active)
      .reduce((sum, s) => {
        if (s.frequency === 'monthly') return sum + Number(s.amount);
        if (s.frequency === 'yearly') return sum + Number(s.amount) / 12;
        if (s.frequency === 'weekly') return sum + Number(s.amount) * 4;
        return sum;
      }, 0);

    const avgTxSize = txCount > 0
      ? monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) / Math.max(monthTx.filter(t => t.type === 'expense').length, 1)
      : 0;

    return [
      { icon: Receipt, label: 'Transactions', value: txCount.toString(), sub: 'this month', color: 'primary' },
      { icon: CreditCard, label: 'Active Accounts', value: activeAccounts.toString(), sub: `of ${accounts.length}`, color: 'accent' },
      { icon: ArrowUpDown, label: 'Avg. Expense', value: formatCurrency(avgTxSize), sub: 'per transaction', color: 'expense' },
      { icon: Zap, label: 'Subscriptions', value: formatCurrency(monthlySubs), sub: `${activeSubs} active`, color: 'warning' },
    ];
  }, [transactions, accounts, subscriptions, formatCurrency]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.05 }}
          className="stat-card p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-${stat.color}/10`}>
              <stat.icon className={`h-3.5 w-3.5 text-${stat.color}`} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
          </div>
          <p className="text-lg font-bold">{stat.value}</p>
          <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
