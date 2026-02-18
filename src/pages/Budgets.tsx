import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts';
import { cn } from '@/lib/utils';
import { Plus, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Loader2, Wallet, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3, ShieldAlert, Percent } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { AddBudgetModal } from '@/components/budgets/AddBudgetModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, RadialBarChart, RadialBar } from 'recharts';

const Budgets = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { formatCurrency } = useCurrency();

  const currentMonth = format(currentDate, 'yyyy-MM');
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    transactions.filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && txDate >= monthStart && txDate <= monthEnd;
    }).forEach(t => {
      if (t.category_id) spending[t.category_id] = (spending[t.category_id] || 0) + Number(t.amount);
    });
    return spending;
  }, [transactions, monthStart, monthEnd]);

  // Previous month spending for comparison
  const prevMonthSpending = useMemo(() => {
    const prevStart = startOfMonth(subMonths(currentDate, 1));
    const prevEnd = endOfMonth(subMonths(currentDate, 1));
    const spending: Record<string, number> = {};
    transactions.filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && txDate >= prevStart && txDate <= prevEnd;
    }).forEach(t => {
      if (t.category_id) spending[t.category_id] = (spending[t.category_id] || 0) + Number(t.amount);
    });
    return spending;
  }, [transactions, currentDate]);

  const monthBudgets = useMemo(() => {
    return budgets.filter(b => b.month === currentMonth).map(budget => {
      const category = categories.find(c => c.id === budget.category_id);
      const spent = categorySpending[budget.category_id] || 0;
      const prevSpent = prevMonthSpending[budget.category_id] || 0;
      const percentage = (spent / Number(budget.amount)) * 100;
      const remaining = Number(budget.amount) - spent;
      const change = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : 0;
      return { ...budget, category, spent, percentage, remaining, prevSpent, change };
    }).filter(b => b.category);
  }, [budgets, categories, categorySpending, prevMonthSpending, currentMonth]);

  // Unbudgeted spending
  const unbudgetedSpending = useMemo(() => {
    const budgetedCategoryIds = new Set(monthBudgets.map(b => b.category_id));
    const unbudgeted: { name: string; amount: number; color: string }[] = [];
    Object.entries(categorySpending).forEach(([catId, amount]) => {
      if (!budgetedCategoryIds.has(catId)) {
        const cat = categories.find(c => c.id === catId);
        if (cat && cat.type === 'expense') unbudgeted.push({ name: cat.name, amount, color: cat.color || '#6366F1' });
      }
    });
    return unbudgeted.sort((a, b) => b.amount - a.amount);
  }, [categorySpending, monthBudgets, categories]);

  const needsBudgets = monthBudgets.filter(b => b.category?.category_group === 'Needs');
  const wantsBudgets = monthBudgets.filter(b => b.category?.category_group === 'Wants');
  const otherBudgets = monthBudgets.filter(b => b.category?.category_group !== 'Needs' && b.category?.category_group !== 'Wants');

  const totalBudget = monthBudgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = monthBudgets.reduce((sum, b) => sum + b.spent, 0);
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const onBudgetCount = monthBudgets.filter(b => b.percentage <= 100).length;
  const overBudgetCount = monthBudgets.filter(b => b.percentage > 100).length;
  const nearLimitCount = monthBudgets.filter(b => b.percentage >= 80 && b.percentage <= 100).length;

  const pieData = monthBudgets.map(b => ({ name: b.category?.name || '', value: b.spent, fill: b.category?.color || '#6366F1' })).filter(d => d.value > 0);

  const { resetAlerts } = useBudgetAlerts(monthBudgets);
  useEffect(() => { resetAlerts(); }, [currentMonth]);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-gradient-to-r from-expense to-expense/80';
    if (percentage >= 80) return 'bg-gradient-to-r from-warning to-warning/80';
    return 'bg-gradient-to-r from-primary to-primary/80';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100) return <AlertCircle className="h-4 w-4 text-expense" />;
    if (percentage >= 80) return <AlertCircle className="h-4 w-4 text-warning" />;
    return <CheckCircle2 className="h-4 w-4 text-primary" />;
  };

  const isLoading = budgetsLoading || categoriesLoading || transactionsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative"><div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" /><Loader2 className="h-12 w-12 animate-spin text-primary relative" /></div>
          <p className="text-muted-foreground animate-pulse">Loading budgets...</p>
        </div>
      </AppLayout>
    );
  }

  const BudgetCard = ({ budget, index, delay }: { budget: typeof monthBudgets[0]; index: number; delay: number }) => (
    <motion.div
      key={budget.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay + index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className="stat-card group cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-transform group-hover:scale-110" style={{ backgroundColor: `${budget.category?.color}15` }}>
            {budget.category?.icon === 'home' && '🏠'}
            {budget.category?.icon === 'shopping-cart' && '🛒'}
            {budget.category?.icon === 'car' && '🚗'}
            {budget.category?.icon === 'zap' && '⚡'}
            {budget.category?.icon === 'heart-pulse' && '💊'}
            {budget.category?.icon === 'utensils' && '🍽️'}
            {budget.category?.icon === 'film' && '🎬'}
            {budget.category?.icon === 'shopping-bag' && '🛍️'}
            {budget.category?.icon === 'repeat' && '📺'}
            {budget.category?.icon === 'sparkles' && '✨'}
            {!['home','shopping-cart','car','zap','heart-pulse','utensils','film','shopping-bag','repeat','sparkles'].includes(budget.category?.icon || '') && '📁'}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{budget.category?.name}</h3>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground">{budget.rollover ? 'Rollover' : 'Fixed'}</p>
              {budget.change !== 0 && budget.prevSpent > 0 && (
                <Badge variant="outline" className={cn('text-[9px] h-4 px-1', budget.change > 0 ? 'border-expense/30 text-expense' : 'border-income/30 text-income')}>
                  {budget.change > 0 ? '↑' : '↓'}{Math.abs(budget.change).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
        </div>
        {getStatusIcon(budget.percentage)}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground truncate">{formatCurrency(budget.spent)} spent</span>
          <span className={cn('font-bold truncate', budget.remaining < 0 ? 'text-expense' : 'text-foreground')}>
            {formatCurrency(Math.abs(budget.remaining))} {budget.remaining < 0 ? 'over' : 'left'}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted/50">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(budget.percentage, 100)}%` }} transition={{ delay: delay + 0.05 + index * 0.05, duration: 0.6 }} className={cn('absolute inset-y-0 left-0 rounded-full', getStatusColor(budget.percentage))} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{budget.percentage.toFixed(0)}% used</span>
          <span>{formatCurrency(Number(budget.amount))} budget</span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Budgets</h1>
            <p className="text-muted-foreground mt-1 text-sm">Monitor spending limits and category budgets</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/30">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="px-3 font-semibold text-sm min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button className="gap-2 btn-premium" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" /><span className="hidden sm:inline">New Budget</span>
            </Button>
          </div>
        </motion.div>

        <AddBudgetModal open={showAddModal} onOpenChange={setShowAddModal} month={currentMonth} />

        {/* Stats Row */}
        {monthBudgets.length > 0 && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Budget', value: formatCurrency(totalBudget), icon: Wallet, color: 'text-primary' },
              { label: 'Total Spent', value: formatCurrency(totalSpent), icon: TrendingDown, color: budgetProgress > 100 ? 'text-expense' : 'text-foreground' },
              { label: 'On Budget', value: `${onBudgetCount}/${monthBudgets.length}`, icon: CheckCircle2, color: 'text-income', sub: `${nearLimitCount} near limit` },
              { label: 'Over Budget', value: String(overBudgetCount), icon: ShieldAlert, color: overBudgetCount > 0 ? 'text-expense' : 'text-muted-foreground' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="stat-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{stat.label}</p>
                    <p className={cn('text-lg sm:text-2xl font-bold mt-1 truncate', stat.color)}>{stat.value}</p>
                    {stat.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>}
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                    <stat.icon className={cn('h-4 w-4', stat.color)} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Summary Bar */}
        {monthBudgets.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Budget Progress</p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalSpent)}</span>
                  <span className="text-sm text-muted-foreground">of {formatCurrency(totalBudget)}</span>
                </div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">{budgetProgress.toFixed(0)}% spent</span>
                  <span className={cn('font-bold', totalBudget - totalSpent < 0 ? 'text-expense' : 'text-income')}>
                    {formatCurrency(Math.abs(totalBudget - totalSpent))} {totalBudget - totalSpent < 0 ? 'over' : 'remaining'}
                  </span>
                </div>
                <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(budgetProgress, 100)}%` }} transition={{ delay: 0.2, duration: 0.8 }} className={cn('absolute inset-y-0 left-0 rounded-full', budgetProgress >= 100 ? 'bg-gradient-to-r from-expense to-expense/80' : 'bg-gradient-to-r from-primary to-accent')} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics */}
        {monthBudgets.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Tabs defaultValue="breakdown" className="stat-card">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="breakdown" className="text-xs gap-1.5"><PieChartIcon className="h-3 w-3" />Breakdown</TabsTrigger>
                <TabsTrigger value="vs-budget" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" />vs Budget</TabsTrigger>
              </TabsList>
              <TabsContent value="breakdown">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} strokeWidth={0}>
                        {pieData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-muted-foreground truncate max-w-[80px]">{d.name}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="vs-budget">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthBudgets.map(b => ({ name: (b.category?.name || '').slice(0, 8), budget: Number(b.amount), spent: b.spent }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                      <Bar dataKey="budget" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {monthBudgets.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="stat-card flex flex-col items-center justify-center py-16">
              <div className="relative mb-6"><div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" /><div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center"><Wallet className="h-8 w-8 text-muted-foreground" /></div></div>
              <h3 className="text-xl font-bold mb-2">No budgets for this month</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6 text-sm">Create your first budget to start tracking spending limits</p>
              <Button className="gap-2 btn-premium" onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" />Create Budget</Button>
            </motion.div>
          ) : (
            <>
              {/* Needs */}
              {needsBudgets.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold">Needs</h2>
                    <Badge variant="secondary" className="text-[10px]">Essential • {needsBudgets.length} categories</Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {needsBudgets.map((budget, index) => <BudgetCard key={budget.id} budget={budget} index={index} delay={0.3} />)}
                  </div>
                </motion.div>
              )}

              {/* Wants */}
              {wantsBudgets.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold">Wants</h2>
                    <Badge variant="secondary" className="text-[10px]">Discretionary • {wantsBudgets.length} categories</Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {wantsBudgets.map((budget, index) => <BudgetCard key={budget.id} budget={budget} index={index} delay={0.4} />)}
                  </div>
                </motion.div>
              )}

              {/* Other */}
              {otherBudgets.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold">Other</h2>
                    <Badge variant="secondary" className="text-[10px]">{otherBudgets.length} categories</Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {otherBudgets.map((budget, index) => <BudgetCard key={budget.id} budget={budget} index={index} delay={0.5} />)}
                  </div>
                </motion.div>
              )}

              {/* Unbudgeted Spending */}
              {unbudgetedSpending.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="stat-card">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
                      <ShieldAlert className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Unbudgeted Spending</h3>
                      <p className="text-[10px] text-muted-foreground">{unbudgetedSpending.length} categories without budgets</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {unbudgetedSpending.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium truncate">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold text-expense shrink-0">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Budgets;
