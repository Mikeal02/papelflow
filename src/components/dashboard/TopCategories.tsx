import { motion } from 'framer-motion';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="stat-card flex items-center justify-center min-h-[200px]"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold">Top Spending</h3>
        <span className="text-sm text-muted-foreground">This month</span>
      </div>

      {topCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">No spending data yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topCategories.map((item, index) => {
            const percentage = total > 0 ? (item.amount / total) * 100 : 0;

            return (
              <motion.div
                key={item.category!.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[index]}`}
                >
                  <span className="text-lg">
                    {categoryEmojis[item.category!.name] || '📁'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">{item.category!.name}</span>
                    <span className="font-semibold">${item.amount.toFixed(0)}</span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.55 + index * 0.05, duration: 0.6 }}
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
