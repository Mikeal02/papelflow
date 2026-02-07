import { motion } from 'framer-motion';
import { Calendar, AlertCircle, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function UpcomingBills() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { formatCurrency } = useCurrency();

  const sortedSubscriptions = subscriptions
    .filter((s) => s.is_active)
    .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())
    .slice(0, 4);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
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
      transition={{ delay: 0.45, duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Upcoming Bills</h3>
        <Link to="/subscriptions">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-8 gap-1">
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {sortedSubscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No upcoming bills</p>
          <p className="text-sm text-muted-foreground">Add subscriptions to track them</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedSubscriptions.map((subscription, index) => {
            const daysUntil = differenceInDays(new Date(subscription.next_due), new Date());
            const isUrgent = daysUntil <= 3 && daysUntil >= 0;
            const isPaid = daysUntil < 0;

            return (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.04 }}
                className="flex items-center gap-3 rounded-lg p-3 bg-muted/30"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    isUrgent && !isPaid ? 'bg-warning/10' : 'bg-muted',
                    isPaid && 'bg-income/10'
                  )}
                >
                  {isPaid ? (
                    <CheckCircle2 className="h-4 w-4 text-income" />
                  ) : isUrgent ? (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  ) : (
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{subscription.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isPaid
                      ? 'Paid'
                      : daysUntil === 0
                      ? 'Due today'
                      : daysUntil === 1
                      ? 'Due tomorrow'
                      : `Due in ${daysUntil} days`}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 max-w-[90px]">
                  <span className="font-semibold tabular-nums text-sm truncate block" title={formatCurrency(Number(subscription.amount))}>
                    {formatCurrency(Number(subscription.amount))}
                  </span>
                  <p className="text-xs text-muted-foreground capitalize">{subscription.frequency}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
