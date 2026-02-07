import { motion } from 'framer-motion';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2 } from 'lucide-react';

const colors = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
];

const categoryEmojis: Record<string, string> = {
  'Housing': '🏠',
  'Groceries': '🛒',
  'Shopping': '🛍️',
  'Dining Out': '🍽️',
  'Utilities': '⚡',
  'Transportation': '🚗',
  'Entertainment': '🎬',
  'Subscriptions': '📺',
  'Personal Care': '✨',
  'Health': '💊',
};

export function TopCategories() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();

  // Calculate spending per category
  const categorySpending = transactions
    .filter((t) => t.type === 'expense' && t.category_id)
    .reduce((acc, t) => {
      const catId = t.category_id!;
      acc[catId] = (acc[catId] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const topCategories = Object.entries(categorySpending)
    .map(([categoryId, amount]) => ({
      category: categories.find((c) => c.id === categoryId),
      amount,
    }))
    .filter((item) => item.category)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const total = topCategories.reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="stat-card flex items-center justify-center min-h-[200px]"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Top Spending</h3>
        <span className="text-xs text-muted-foreground">This month</span>
      </div>

      {topCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">No spending data yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topCategories.map((item, index) => {
            const percentage = total > 0 ? (item.amount / total) * 100 : 0;

            return (
              <motion.div
                key={item.category!.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.04 }}
                className="flex items-center gap-3"
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center ${colors[index]}`}
                >
                  <span className="text-base">
                    {categoryEmojis[item.category!.name] || '📁'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm truncate flex-1">{item.category!.name}</span>
                    <span className="font-semibold text-sm truncate max-w-[80px] sm:max-w-[100px]" title={formatCurrency(item.amount)}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.4 + index * 0.04, duration: 0.5 }}
                      className={`absolute inset-y-0 left-0 rounded-full ${colors[index]}`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
