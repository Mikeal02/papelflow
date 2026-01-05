import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import {
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Bell,
  BellOff,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockSubscriptions, mockCategories } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const Subscriptions = () => {
  const activeSubscriptions = mockSubscriptions.filter((s) => s.isActive);
  const totalMonthly = activeSubscriptions.reduce((sum, s) => {
    if (s.frequency === 'monthly') return sum + s.amount;
    if (s.frequency === 'yearly') return sum + s.amount / 12;
    if (s.frequency === 'weekly') return sum + s.amount * 4;
    return sum;
  }, 0);

  const totalYearly = totalMonthly * 12;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground mt-1">
              Track your recurring payments
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Subscription
          </Button>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Active Subscriptions</p>
            <p className="text-3xl font-bold mt-2">{activeSubscriptions.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Monthly Cost</p>
            <p className="text-3xl font-bold mt-2">
              ${totalMonthly.toFixed(2)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Yearly Cost</p>
            <p className="text-3xl font-bold mt-2">
              ${totalYearly.toFixed(0)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Next Payment</p>
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="h-5 w-5 text-warning" />
              <span className="text-xl font-semibold">Jan 15</span>
            </div>
          </div>
        </motion.div>

        {/* Subscriptions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">All Subscriptions</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span>Reminders enabled</span>
            </div>
          </div>

          <div className="space-y-4">
            {mockSubscriptions.map((subscription, index) => {
              const category = mockCategories.find(
                (c) => c.id === subscription.categoryId
              );
              const daysUntil = differenceInDays(
                new Date(subscription.nextDue),
                new Date()
              );
              const isUrgent = daysUntil <= 3 && daysUntil >= 0;

              return (
                <motion.div
                  key={subscription.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  className={cn(
                    'flex items-center gap-4 rounded-xl p-4 border transition-colors group',
                    subscription.isActive
                      ? 'bg-card/50 border-border/50 hover:border-border'
                      : 'bg-muted/30 border-border/30 opacity-60'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl text-xl',
                      isUrgent ? 'bg-warning/10' : 'bg-muted'
                    )}
                  >
                    {subscription.name === 'Netflix' && '📺'}
                    {subscription.name === 'Spotify' && '🎵'}
                    {subscription.name === 'Gym Membership' && '💪'}
                    {subscription.name === 'Cloud Storage' && '☁️'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{subscription.name}</h4>
                      {isUrgent && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-warning/10 text-warning">
                          <AlertCircle className="h-3 w-3" />
                          Due soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category?.name} • {subscription.frequency}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold tabular-nums">
                      ${subscription.amount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(subscription.nextDue), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={subscription.isActive}
                      className="data-[state=checked]:bg-primary"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Mark as paid</DropdownMenuItem>
                        <DropdownMenuItem>View history</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Subscriptions;
