import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays, addWeeks, addMonths, addYears } from 'date-fns';
import {
  Plus,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Bell,
  Loader2,
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
import { useSubscriptions, useUpdateSubscription, useDeleteSubscription, Subscription } from '@/hooks/useSubscriptions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { AddSubscriptionModal } from '@/components/subscriptions/AddSubscriptionModal';
import { EditSubscriptionModal } from '@/components/subscriptions/EditSubscriptionModal';
import { toast } from '@/hooks/use-toast';

const Subscriptions = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useSubscriptions();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();
  const { formatCurrency } = useCurrency();

  const handleEdit = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowEditModal(true);
  };

  const handleMarkAsPaid = async (subscription: Subscription) => {
    const currentDue = new Date(subscription.next_due);
    let nextDue: Date;
    
    switch (subscription.frequency) {
      case 'weekly':
        nextDue = addWeeks(currentDue, 1);
        break;
      case 'monthly':
        nextDue = addMonths(currentDue, 1);
        break;
      case 'yearly':
        nextDue = addYears(currentDue, 1);
        break;
      default:
        nextDue = addMonths(currentDue, 1);
    }
    
    await updateSubscription.mutateAsync({
      id: subscription.id,
      next_due: nextDue.toISOString().split('T')[0],
    });
    
    toast({
      title: 'Marked as paid',
      description: `Next payment due on ${format(nextDue, 'MMM d, yyyy')}`,
    });
  };

  const activeSubscriptions = subscriptions.filter((s) => s.is_active);
  const totalMonthly = activeSubscriptions.reduce((sum, s) => {
    if (s.frequency === 'monthly') return sum + Number(s.amount);
    if (s.frequency === 'yearly') return sum + Number(s.amount) / 12;
    if (s.frequency === 'weekly') return sum + Number(s.amount) * 4;
    return sum;
  }, 0);

  const totalYearly = totalMonthly * 12;

  const nextPayment = subscriptions.length > 0
    ? subscriptions
        .filter(s => s.is_active)
        .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())[0]
    : null;

  const isLoading = subscriptionsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

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
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Add Subscription
          </Button>
        </motion.div>

        <AddSubscriptionModal open={showAddModal} onOpenChange={setShowAddModal} />
        <EditSubscriptionModal 
          open={showEditModal} 
          onOpenChange={setShowEditModal} 
          subscription={selectedSubscription} 
        />

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="stat-card">
            <p className="text-xs sm:text-sm text-muted-foreground">Active Subscriptions</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2">{activeSubscriptions.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs sm:text-sm text-muted-foreground">Monthly Cost</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2 truncate" title={formatCurrency(totalMonthly)}>
              {formatCurrency(totalMonthly)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs sm:text-sm text-muted-foreground">Yearly Cost</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2 truncate" title={formatCurrency(totalYearly)}>
              {formatCurrency(totalYearly)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs sm:text-sm text-muted-foreground">Next Payment</p>
            <div className="flex items-center gap-2 mt-1 sm:mt-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
              <span className="text-base sm:text-lg md:text-xl font-semibold truncate">
                {nextPayment ? format(new Date(nextPayment.next_due), 'MMM d') : 'N/A'}
              </span>
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

          {subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No subscriptions yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Add your recurring payments to track them and never miss a due date.
              </p>
              <Button className="gap-2" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4" />
                Add Subscription
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription, index) => {
                const category = categories.find(
                  (c) => c.id === subscription.category_id
                );
                const daysUntil = differenceInDays(
                  new Date(subscription.next_due),
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
                      subscription.is_active
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
                      📺
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-none" title={subscription.name}>{subscription.name}</h4>
                        {isUrgent && (
                          <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded-full bg-warning/10 text-warning flex-shrink-0">
                            <AlertCircle className="h-3 w-3" />
                            <span className="hidden xs:inline">Due soon</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {category?.name || 'Uncategorized'} • {subscription.frequency}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold tabular-nums text-sm sm:text-base" title={formatCurrency(Number(subscription.amount))}>
                        {formatCurrency(Number(subscription.amount))}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(subscription.next_due), 'MMM d')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={subscription.is_active || false}
                        onCheckedChange={(checked) => 
                          updateSubscription.mutate({ id: subscription.id, is_active: checked })
                        }
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
                          <DropdownMenuItem onClick={() => handleEdit(subscription)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkAsPaid(subscription)}>
                            Mark as paid
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteSubscription.mutate(subscription.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Subscriptions;
