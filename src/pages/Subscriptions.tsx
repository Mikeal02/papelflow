import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, addWeeks, addMonths, addYears } from 'date-fns';
import {
  Plus,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Bell,
  Loader2,
  Search,
  TrendingUp,
  DollarSign,
  BarChart3,
  Filter,
  CreditCard,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscriptions, useUpdateSubscription, useDeleteSubscription, Subscription } from '@/hooks/useSubscriptions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { AddSubscriptionModal } from '@/components/subscriptions/AddSubscriptionModal';
import { EditSubscriptionModal } from '@/components/subscriptions/EditSubscriptionModal';
import { toast } from '@/hooks/use-toast';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const COLORS = [
  'hsl(215, 85%, 55%)', 'hsl(155, 70%, 45%)', 'hsl(170, 75%, 45%)',
  'hsl(40, 95%, 50%)', 'hsl(0, 78%, 58%)', 'hsl(280, 70%, 55%)',
];

const Subscriptions = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
      case 'weekly': nextDue = addWeeks(currentDue, 1); break;
      case 'monthly': nextDue = addMonths(currentDue, 1); break;
      case 'yearly': nextDue = addYears(currentDue, 1); break;
      default: nextDue = addMonths(currentDue, 1);
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

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => {
      const matchesSearch = searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFrequency = frequencyFilter === 'all' || s.frequency === frequencyFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? s.is_active : !s.is_active);
      return matchesSearch && matchesFrequency && matchesStatus;
    });
  }, [subscriptions, searchQuery, frequencyFilter, statusFilter]);

  const activeSubscriptions = subscriptions.filter((s) => s.is_active);
  const totalMonthly = activeSubscriptions.reduce((sum, s) => {
    if (s.frequency === 'monthly') return sum + Number(s.amount);
    if (s.frequency === 'yearly') return sum + Number(s.amount) / 12;
    if (s.frequency === 'weekly') return sum + Number(s.amount) * 4;
    return sum;
  }, 0);
  const totalYearly = totalMonthly * 12;
  const totalDaily = totalMonthly / 30;

  const nextPayment = activeSubscriptions
    .sort((a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime())[0] || null;

  const urgentCount = activeSubscriptions.filter(s => {
    const d = differenceInDays(new Date(s.next_due), new Date());
    return d >= 0 && d <= 3;
  }).length;

  const byFrequency = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    activeSubscriptions.forEach(s => {
      if (!map[s.frequency]) map[s.frequency] = { count: 0, total: 0 };
      map[s.frequency].count++;
      map[s.frequency].total += Number(s.amount);
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data, value: data.total }));
  }, [activeSubscriptions]);

  const byCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    activeSubscriptions.forEach(s => {
      const cat = categories.find(c => c.id === s.category_id);
      const name = cat?.name || 'Uncategorized';
      map[name] = (map[name] || 0) + Number(s.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeSubscriptions, categories]);

  const isLoading = subscriptionsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading subscriptions...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Subscriptions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeSubscriptions.length} active • {urgentCount > 0 && <span className="text-warning">{urgentCount} due soon</span>}
            </p>
          </div>
          <Button className="gap-2 btn-premium" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Subscription</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </motion.div>

        <AddSubscriptionModal open={showAddModal} onOpenChange={setShowAddModal} />
        <EditSubscriptionModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          subscription={selectedSubscription}
        />

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CreditCard, label: 'Active', value: `${activeSubscriptions.length}`, sub: 'subscriptions', color: 'primary' },
            { icon: DollarSign, label: 'Monthly Cost', value: formatCurrency(totalMonthly), sub: `${formatCurrency(totalDaily)}/day`, color: 'expense' },
            { icon: BarChart3, label: 'Yearly Cost', value: formatCurrency(totalYearly), sub: `${formatCurrency(totalMonthly)}/mo`, color: 'warning' },
            { icon: Calendar, label: 'Next Payment', value: nextPayment ? format(new Date(nextPayment.next_due), 'MMM d') : 'N/A', sub: nextPayment?.name || '', color: 'accent' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className="stat-card p-3 md:p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${item.color}/10 shrink-0`}>
                  <item.icon className={`h-4 w-4 text-${item.color}`} />
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground font-medium truncate">{item.label}</span>
              </div>
              <p className="text-base md:text-lg font-bold truncate" title={item.value}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Analytics Row */}
        {activeSubscriptions.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="stat-card"
            >
              <h3 className="font-semibold text-sm mb-3">Cost by Category</h3>
              {byCategoryData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-[120px] h-[120px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byCategoryData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {byCategoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {byCategoryData.slice(0, 4).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs truncate flex-1">{item.name}</span>
                        <span className="text-xs font-bold shrink-0">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">No data</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="stat-card"
            >
              <h3 className="font-semibold text-sm mb-3">By Frequency</h3>
              <div className="space-y-3">
                {byFrequency.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] capitalize">{item.name}</Badge>
                      <span className="text-xs text-muted-foreground">{item.count} subs</span>
                    </div>
                    <span className="text-sm font-bold">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                {byFrequency.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No data</p>}
              </div>
            </motion.div>
          </div>
        )}

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/30 border-border/50"
            />
          </div>
          <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
            <SelectTrigger className="w-[120px] bg-muted/30 border-border/50 hidden sm:flex">
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[100px] bg-muted/30 border-border/50 hidden sm:flex">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Paused</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Subscriptions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">{filteredSubscriptions.length} Subscriptions</h3>
            {urgentCount > 0 && (
              <div className="flex items-center gap-1.5 text-warning text-xs">
                <Bell className="h-3.5 w-3.5" />
                <span>{urgentCount} due soon</span>
              </div>
            )}
          </div>

          {filteredSubscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">No subscriptions found</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6 text-sm">
                {searchQuery ? 'Try adjusting your search' : 'Add your recurring payments to track them'}
              </p>
              {!searchQuery && (
                <Button className="gap-2 btn-premium" onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4" />
                  Add Subscription
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredSubscriptions.map((subscription, index) => {
                  const category = categories.find(c => c.id === subscription.category_id);
                  const daysUntil = differenceInDays(new Date(subscription.next_due), new Date());
                  const isUrgent = daysUntil <= 3 && daysUntil >= 0;
                  const isPast = daysUntil < 0;

                  return (
                    <motion.div
                      key={subscription.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'flex items-center gap-3 md:gap-4 rounded-xl p-3 md:p-4 border transition-colors group',
                        subscription.is_active
                          ? 'bg-card/50 border-border/50 hover:border-border'
                          : 'bg-muted/30 border-border/30 opacity-60',
                        isUrgent && 'border-warning/30 bg-warning/5',
                        isPast && 'border-expense/30 bg-expense/5'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl text-lg shrink-0',
                          isUrgent ? 'bg-warning/10' : isPast ? 'bg-expense/10' : 'bg-muted'
                        )}
                      >
                        {isUrgent ? <AlertCircle className="h-5 w-5 text-warning" /> : '📺'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-semibold text-sm truncate max-w-[100px] sm:max-w-[200px]" title={subscription.name}>{subscription.name}</h4>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize shrink-0">{subscription.frequency}</Badge>
                          {isPast && <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">Overdue</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {category?.name || 'Uncategorized'} • {isPast ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold tabular-nums text-sm" title={formatCurrency(Number(subscription.amount))}>
                          {formatCurrency(Number(subscription.amount))}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(subscription.next_due), 'MMM d')}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <Switch
                          checked={subscription.is_active || false}
                          onCheckedChange={(checked) =>
                            updateSubscription.mutate({ id: subscription.id, is_active: checked })
                          }
                          className="data-[state=checked]:bg-primary scale-90 sm:scale-100"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(subscription)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkAsPaid(subscription)}>Mark as paid</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteSubscription.mutate(subscription.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Subscriptions;
