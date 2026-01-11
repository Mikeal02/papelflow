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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="stat-card glow-effect group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-3 min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 flex-wrap">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-income" />
              ) : isNegative ? (
                <TrendingDown className="h-4 w-4 text-expense" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
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
            'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 flex-shrink-0',
            iconColor || 'bg-primary/10'
          )}
        >
          <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', iconColor ? 'text-inherit' : 'text-primary')} />
        </div>
      </div>
    </motion.div>
  );
}
