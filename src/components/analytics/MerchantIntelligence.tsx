import { motion } from 'framer-motion';
import { Store, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics, MerchantInsight } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { TiltCard } from '@/components/ui/tilt-card';

const frequencyLabels = {
  daily: { label: 'Daily', color: 'text-expense' },
  weekly: { label: 'Weekly', color: 'text-warning' },
  monthly: { label: 'Monthly', color: 'text-primary' },
  occasional: { label: 'Occasional', color: 'text-muted-foreground' },
};

const trendIcons = {
  increasing: TrendingUp,
  stable: Minus,
  decreasing: TrendingDown,
};

const trendColors = {
  increasing: 'text-expense',
  stable: 'text-muted-foreground',
  decreasing: 'text-income',
};

export const MerchantIntelligence = () => {
  const { merchantInsights } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();

  if (merchantInsights.length === 0) {
    return (
      <Card className="stat-card">
        <CardContent className="py-8 text-center">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No merchant data yet</p>
        </CardContent>
      </Card>
    );
  }

  // Get initials for merchant logo placeholder
  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  // Generate a consistent color from merchant name
  const getColor = (name: string) => {
    const colors = [
      'from-primary to-accent',
      'from-chart-1 to-chart-3',
      'from-chart-4 to-chart-5',
      'from-income to-chart-3',
      'from-chart-6 to-primary',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="stat-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            Top Merchants
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {merchantInsights.slice(0, 5).map((merchant, index) => {
            const TrendIcon = trendIcons[merchant.trend];
            const freq = frequencyLabels[merchant.frequency];

            return (
              <motion.div
                key={merchant.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TiltCard intensity={5} borderGlow={false} className="p-3 rounded-xl bg-muted/30 border border-border/30 group cursor-pointer hover:border-primary/30">
                  <div className="flex items-center gap-3">
                    {/* Merchant logo placeholder */}
                    <div className={cn(
                      'h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br shadow-lg shrink-0',
                      getColor(merchant.name)
                    )}>
                      {getInitials(merchant.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-sm truncate">{merchant.name}</h4>
                        <span className="text-sm font-bold shrink-0">
                          {formatCurrency(merchant.totalSpent)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-muted-foreground">
                          {merchant.transactionCount} visits
                        </span>
                        <span className="text-muted-foreground">
                          ~{formatCurrency(merchant.avgTransaction)} avg
                        </span>
                        <span className={freq.color}>
                          {freq.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          Last visit: {format(parseISO(merchant.lastVisit), 'MMM d')}
                        </span>
                        <div className={cn('flex items-center gap-1 text-xs', trendColors[merchant.trend])}>
                          <TrendIcon className="h-3 w-3" />
                          <span className="capitalize">{merchant.trend}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}

          {/* Insights summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-3 border-t text-center"
          >
            <p className="text-xs text-muted-foreground">
              You've visited <span className="font-bold text-foreground">{merchantInsights.length}</span> merchants
              {merchantInsights.filter(m => m.frequency === 'daily' || m.frequency === 'weekly').length > 0 && (
                <span>
                  {' • '}
                  <span className="text-warning">
                    {merchantInsights.filter(m => m.frequency === 'daily' || m.frequency === 'weekly').length} frequent
                  </span>
                </span>
              )}
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
