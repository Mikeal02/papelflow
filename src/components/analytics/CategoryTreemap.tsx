import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const CategoryTreemap = () => {
  const { categoryTreemap } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();

  const totalSpend = categoryTreemap.reduce((s, c) => s + c.value, 0);

  // Calculate treemap layout
  const layout = useMemo(() => {
    if (categoryTreemap.length === 0) return [];

    const items = categoryTreemap.map(c => ({
      ...c,
      percentage: totalSpend > 0 ? (c.value / totalSpend) * 100 : 0,
    }));

    // Simple row-based layout
    const rows: typeof items[] = [];
    let currentRow: typeof items = [];
    let currentRowPercentage = 0;

    items.forEach(item => {
      if (currentRowPercentage + item.percentage > 50 && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [item];
        currentRowPercentage = item.percentage;
      } else {
        currentRow.push(item);
        currentRowPercentage += item.percentage;
      }
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }, [categoryTreemap, totalSpend]);

  if (categoryTreemap.length === 0) {
    return (
      <Card className="stat-card">
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No spending data this month</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="stat-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Spending Breakdown
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Treemap visualization */}
          <div className="space-y-1.5">
            {layout.map((row, rowIndex) => {
              const rowTotal = row.reduce((s, c) => s + c.percentage, 0);
              
              return (
                <div key={rowIndex} className="flex gap-1.5 h-20">
                  {row.map((category, colIndex) => {
                    const widthPercent = rowTotal > 0 ? (category.percentage / rowTotal) * 100 : 0;
                    
                    return (
                      <Tooltip key={category.name}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: (rowIndex * 3 + colIndex) * 0.05 }}
                            className={cn(
                              'rounded-xl p-3 flex flex-col justify-between cursor-pointer',
                              'hover:ring-2 hover:ring-primary/50 transition-all',
                              'overflow-hidden relative group'
                            )}
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: `${category.color}20`,
                              borderLeft: `3px solid ${category.color}`,
                            }}
                          >
                            {/* Hover glow */}
                            <motion.div
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{
                                background: `linear-gradient(135deg, ${category.color}30, transparent)`,
                              }}
                            />
                            
                            <span className="text-xs font-medium truncate relative z-10">
                              {category.name}
                            </span>
                            <span className="text-sm font-bold relative z-10">
                              {category.percentage.toFixed(0)}%
                            </span>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <p className="font-medium">{category.name}</p>
                            <p className="text-lg font-bold">{formatCurrency(category.value)}</p>
                            <p className="text-xs text-muted-foreground">
                              {category.percentage.toFixed(1)}% of total
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {categoryTreemap.slice(0, 6).map((category, i) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center gap-1.5 text-xs"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-muted-foreground">{category.name}</span>
              </motion.div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total this month</span>
            <span className="text-xl font-bold">{formatCurrency(totalSpend)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
