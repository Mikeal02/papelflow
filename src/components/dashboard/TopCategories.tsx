import { motion } from 'framer-motion';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, TrendingUp, Sparkles, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const gradients = [
  'from-chart-1 to-chart-1/70',
  'from-chart-2 to-chart-2/70',
  'from-chart-3 to-chart-3/70',
  'from-chart-4 to-chart-4/70',
  'from-chart-5 to-chart-5/70',
];

const glowColors = [
  'shadow-[0_4px_20px_-4px_hsl(var(--chart-1)/0.4)]',
  'shadow-[0_4px_20px_-4px_hsl(var(--chart-2)/0.4)]',
  'shadow-[0_4px_20px_-4px_hsl(var(--chart-3)/0.4)]',
  'shadow-[0_4px_20px_-4px_hsl(var(--chart-4)/0.4)]',
  'shadow-[0_4px_20px_-4px_hsl(var(--chart-5)/0.4)]',
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
  'Travel': '✈️',
  'Education': '📚',
  'Fitness': '💪',
  'Coffee': '☕',
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
  const topSpender = topCategories[0];

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="stat-card flex items-center justify-center min-h-[200px]"
      >
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-6 w-6 text-primary" />
          </motion.div>
          <p className="text-xs text-muted-foreground">Loading categories...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="stat-card relative overflow-hidden"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-chart-1/[0.02] via-transparent to-chart-3/[0.02] pointer-events-none" />
      
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-chart-1/20 to-chart-3/20 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-chart-1" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Top Spending</h3>
            <p className="text-[10px] text-muted-foreground">This month's breakdown</p>
          </div>
        </div>
        {topSpender && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-right"
          >
            <p className="text-lg font-bold text-foreground">{formatCurrency(total)}</p>
            <p className="text-[9px] text-muted-foreground">Total spent</p>
          </motion.div>
        )}
      </div>

      {topCategories.length === 0 ? (
        <motion.div 
          className="flex flex-col items-center justify-center py-10 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="relative mb-4"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-chart-1/20 to-chart-3/20 blur-xl" />
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center border border-border/50">
              <BarChart3 className="h-7 w-7 text-muted-foreground" />
            </div>
          </motion.div>
          <p className="text-sm font-medium mb-1">No spending data yet</p>
          <p className="text-xs text-muted-foreground">Add expenses to see categories</p>
        </motion.div>
      ) : (
        <div className="space-y-3.5">
          {topCategories.map((item, index) => {
            const percentage = total > 0 ? (item.amount / total) * 100 : 0;
            const isTopSpender = index === 0;

            return (
              <motion.div
                key={item.category!.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.06, type: 'spring', stiffness: 300 }}
                whileHover={{ x: 4 }}
                className="group"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={cn(
                      `h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center`,
                      gradients[index],
                      glowColors[index]
                    )}
                  >
                    <span className="text-lg">
                      {categoryEmojis[item.category!.name] || '📁'}
                    </span>
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm truncate">{item.category!.name}</span>
                        {isTopSpender && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium shrink-0"
                          >
                            <TrendingUp className="h-2.5 w-2.5" />
                            Top
                          </motion.span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
                        <span className="font-bold text-sm tabular-nums" title={formatCurrency(item.amount)}>
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Premium progress bar */}
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/50">
                      {/* Glow effect */}
                      <motion.div
                        className={cn('absolute inset-y-0 left-0 rounded-full blur-sm opacity-60 bg-gradient-to-r', gradients[index])}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.4 + index * 0.06, duration: 0.6 }}
                      />
                      
                      {/* Main bar */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.4 + index * 0.06, duration: 0.6, ease: 'easeOut' }}
                        className={cn('relative h-full rounded-full bg-gradient-to-r', gradients[index])}
                      >
                        {/* Shine effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                          initial={{ x: '-100%' }}
                          animate={{ x: '200%' }}
                          transition={{ delay: 0.7 + index * 0.1, duration: 0.8, repeat: 0 }}
                        />
                      </motion.div>
                    </div>
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
