import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function StatCard({ title, value, change, icon: Icon, iconColor, delay = 0 }: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className="stat-card group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight truncate">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-income" />
              ) : isNegative ? (
                <TrendingDown className="h-3.5 w-3.5 text-expense" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive && 'text-income',
                  isNegative && 'text-expense',
                  !isPositive && !isNegative && 'text-muted-foreground'
                )}
              >
                {isPositive ? '+' : ''}
                {change.toFixed(1)}% from last month
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 flex-shrink-0',
            iconColor || 'bg-primary/10'
          )}
        >
          <Icon className={cn('h-5 w-5', iconColor ? 'text-inherit' : 'text-primary')} />
        </div>
      </div>
    </motion.div>
  );
}
