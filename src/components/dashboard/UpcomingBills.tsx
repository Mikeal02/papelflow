import { motion } from 'framer-motion';
import { Calendar, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
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
      transition={{ delay: 0.5, duration: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold">Upcoming Bills</h3>
        <Link to="/subscriptions">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            View all
          </Button>
        </Link>
      </div>

      {sortedSubscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No upcoming bills</p>
          <p className="text-sm text-muted-foreground">Add subscriptions to track them</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSubscriptions.map((subscription, index) => {
            const daysUntil = differenceInDays(new Date(subscription.next_due), new Date());
            const isUrgent = daysUntil <= 3 && daysUntil >= 0;
            const isPaid = daysUntil < 0;

            return (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="flex items-center gap-3 rounded-xl p-3 bg-muted/20"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    isUrgent && !isPaid ? 'bg-warning/10' : 'bg-muted',
                    isPaid && 'bg-income/10'
                  )}
                >
                  {isPaid ? (
                    <CheckCircle2 className="h-5 w-5 text-income" />
                  ) : isUrgent ? (
                    <AlertCircle className="h-5 w-5 text-warning" />
                  ) : (
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{subscription.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPaid
                      ? 'Paid'
                      : daysUntil === 0
                      ? 'Due today'
                      : daysUntil === 1
                      ? 'Due tomorrow'
                      : `Due in ${daysUntil} days`}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 max-w-[100px] sm:max-w-[130px]">
                  <span className="font-semibold tabular-nums text-sm sm:text-base truncate block" title={formatCurrency(Number(subscription.amount))}>
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
