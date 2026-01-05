import { motion } from 'framer-motion';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { mockSubscriptions } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function UpcomingBills() {
  const sortedSubscriptions = [...mockSubscriptions]
    .filter((s) => s.isActive)
    .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
    .slice(0, 4);

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

      <div className="space-y-3">
        {sortedSubscriptions.map((subscription, index) => {
          const daysUntil = differenceInDays(new Date(subscription.nextDue), new Date());
          const isUrgent = daysUntil <= 3;
          const isPaid = daysUntil < 0;

          return (
            <motion.div
              key={subscription.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              className="flex items-center gap-3 rounded-lg p-3 bg-muted/30"
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
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

              <div className="text-right">
                <span className="font-semibold tabular-nums">${subscription.amount}</span>
                <p className="text-xs text-muted-foreground capitalize">{subscription.frequency}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
