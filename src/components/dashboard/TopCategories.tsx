import { memo, useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const gradients = [
  'from-chart-1 to-chart-1/70',
  'from-chart-2 to-chart-2/70',
  'from-chart-3 to-chart-3/70',
  'from-chart-4 to-chart-4/70',
  'from-chart-5 to-chart-5/70',
];

const categoryEmojis: Record<string, string> = {
  'Housing': '🏠', 'Groceries': '🛒', 'Shopping': '🛍️', 'Dining Out': '🍽️',
  'Utilities': '⚡', 'Transportation': '🚗', 'Entertainment': '🎬', 'Subscriptions': '📺',
  'Personal Care': '✨', 'Health': '💊', 'Travel': '✈️', 'Education': '📚',
  'Fitness': '💪', 'Coffee': '☕',
};

export const TopCategories = memo(function TopCategories() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();

  const { topCategories, total } = useMemo(() => {
    const categorySpending = transactions
      .filter((t) => t.type === 'expense' && t.category_id)
      .reduce((acc, t) => {
        const catId = t.category_id!;
        acc[catId] = (acc[catId] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const top = Object.entries(categorySpending)
      .map(([categoryId, amount]) => ({
        category: categories.find((c) => c.id === categoryId),
        amount,
      }))
      .filter((item) => item.category)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return { topCategories: top, total: top.reduce((sum, item) => sum + item.amount, 0) };
  }, [transactions, categories]);

  if (isLoading) {
    return (
      <div className="stat-card flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-chart-1/[0.02] via-transparent to-chart-3/[0.02] pointer-events-none" />
      
      <div className="relative flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-chart-1/20 to-chart-3/20 flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5 text-chart-1" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate">Top Spending</h3>
            <p className="text-[10px] text-muted-foreground">This month's breakdown</p>
          </div>
        </div>
        {topCategories.length > 0 && (
          <div className="text-right shrink-0">
            <p className="text-base sm:text-lg font-bold text-foreground truncate max-w-[120px]" title={formatCurrency(total)}>{formatCurrency(total)}</p>
            <p className="text-[9px] text-muted-foreground">Total spent</p>
          </div>
        )}
      </div>

      {topCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center border border-border/50">
              <BarChart3 className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium mb-1">No spending data yet</p>
          <p className="text-xs text-muted-foreground">Add expenses to see categories</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {topCategories.map((item, index) => {
            const percentage = total > 0 ? (item.amount / total) * 100 : 0;
            return (
              <div key={item.category!.id} className="group hover:translate-x-1 transition-transform duration-200">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shrink-0',
                    gradients[index]
                  )}>
                    <span className="text-lg">{categoryEmojis[item.category!.name] || '📁'}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <span className="font-semibold text-sm truncate">{item.category!.name}</span>
                        {index === 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium shrink-0">
                            <TrendingUp className="h-2.5 w-2.5" />
                            Top
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
                        <span className="font-bold text-xs sm:text-sm tabular-nums truncate max-w-[80px] sm:max-w-[100px]" title={formatCurrency(item.amount)}>{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                    
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out', gradients[index])}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
