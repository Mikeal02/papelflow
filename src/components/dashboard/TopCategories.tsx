import { motion } from 'framer-motion';
import { getCategorySpending } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const colors = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
];

export function TopCategories() {
  const categorySpending = getCategorySpending();
  const total = categorySpending.reduce((sum, item) => sum + item.amount, 0);

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

      <div className="space-y-4">
        {categorySpending.map((item, index) => {
          const percentage = (item.amount / total) * 100;

          return (
            <motion.div
              key={item.category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + index * 0.05 }}
              className="flex items-center gap-3"
            >
              <div
                className={cn('h-10 w-10 rounded-lg flex items-center justify-center', colors[index])}
              >
                <span className="text-lg">
                  {item.category.name === 'Housing' && '🏠'}
                  {item.category.name === 'Groceries' && '🛒'}
                  {item.category.name === 'Shopping' && '🛍️'}
                  {item.category.name === 'Dining Out' && '🍽️'}
                  {item.category.name === 'Utilities' && '⚡'}
                  {item.category.name === 'Transportation' && '🚗'}
                  {item.category.name === 'Entertainment' && '🎬'}
                  {item.category.name === 'Subscriptions' && '📺'}
                  {item.category.name === 'Personal Care' && '✨'}
                  {item.category.name === 'Health' && '💊'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate">{item.category.name}</span>
                  <span className="font-semibold">${item.amount.toFixed(0)}</span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.55 + index * 0.05, duration: 0.6 }}
                    className={cn('absolute inset-y-0 left-0 rounded-full', colors[index])}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
