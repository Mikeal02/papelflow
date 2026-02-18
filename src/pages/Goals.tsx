import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Calendar, MoreHorizontal, TrendingUp, Loader2, Sparkles, Trophy, Clock, Flame, Filter, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useGoals, useDeleteGoal, useUpdateGoal } from '@/hooks/useGoals';
import { useCurrency } from '@/contexts/CurrencyContext';
import { AddGoalModal } from '@/components/goals/AddGoalModal';
import { cn } from '@/lib/utils';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const GOAL_COLORS = ['hsl(215, 85%, 58%)', 'hsl(155, 65%, 52%)', 'hsl(40, 92%, 52%)', 'hsl(280, 65%, 62%)', 'hsl(0, 75%, 62%)', 'hsl(170, 70%, 55%)'];

const Goals = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortBy, setSortBy] = useState<'deadline' | 'progress' | 'amount'>('progress');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const { data: goals = [], isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  const { formatCurrency } = useCurrency();

  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);

  const processedGoals = useMemo(() => {
    let filtered = goals.map(g => {
      const percentage = Number(g.target_amount) > 0 ? (Number(g.current_amount || 0) / Number(g.target_amount)) * 100 : 0;
      const remaining = Number(g.target_amount) - Number(g.current_amount || 0);
      const daysRemaining = g.deadline ? differenceInDays(new Date(g.deadline), new Date()) : null;
      const monthsRemaining = g.deadline ? differenceInMonths(new Date(g.deadline), new Date()) : null;
      const monthlyNeeded = daysRemaining && daysRemaining > 0 ? remaining / (daysRemaining / 30) : null;
      const weeklyNeeded = daysRemaining && daysRemaining > 0 ? remaining / (daysRemaining / 7) : null;
      const isCompleted = percentage >= 100;
      const isOverdue = daysRemaining !== null && daysRemaining < 0 && !isCompleted;
      const urgency = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0 ? 'urgent' : daysRemaining !== null && daysRemaining <= 90 && daysRemaining > 0 ? 'soon' : 'normal';
      return { ...g, percentage, remaining, daysRemaining, monthsRemaining, monthlyNeeded, weeklyNeeded, isCompleted, isOverdue, urgency };
    });

    if (filterStatus === 'active') filtered = filtered.filter(g => !g.isCompleted);
    else if (filterStatus === 'completed') filtered = filtered.filter(g => g.isCompleted);

    if (sortBy === 'deadline') filtered.sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
    else if (sortBy === 'progress') filtered.sort((a, b) => b.percentage - a.percentage);
    else if (sortBy === 'amount') filtered.sort((a, b) => Number(b.target_amount) - Number(a.target_amount));

    return filtered;
  }, [goals, sortBy, filterStatus]);

  const completedCount = processedGoals.filter(g => g.isCompleted).length;
  const activeCount = processedGoals.filter(g => !g.isCompleted).length;
  const overdueCount = processedGoals.filter(g => g.isOverdue).length;

  const pieData = goals.map((g, i) => ({
    name: g.name,
    value: Number(g.current_amount || 0),
    fill: g.color || GOAL_COLORS[i % GOAL_COLORS.length],
  })).filter(d => d.value > 0);

  const barData = goals.map((g, i) => ({
    name: g.name.length > 10 ? g.name.slice(0, 10) + '…' : g.name,
    saved: Number(g.current_amount || 0),
    remaining: Math.max(0, Number(g.target_amount) - Number(g.current_amount || 0)),
  }));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading goals...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Financial Goals</h1>
            <p className="text-muted-foreground mt-1 text-sm">Track, analyze, and achieve your savings targets</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progress">By Progress</SelectItem>
                <SelectItem value="deadline">By Deadline</SelectItem>
                <SelectItem value="amount">By Amount</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-2 btn-premium h-9" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Goal</span>
            </Button>
          </div>
        </motion.div>

        <AddGoalModal open={showAddModal} onOpenChange={setShowAddModal} />

        {/* Summary Stats */}
        {goals.length > 0 && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Saved', value: formatCurrency(totalSaved), sub: `of ${formatCurrency(totalTarget)}`, icon: Target, color: 'text-income' },
              { label: 'Active Goals', value: String(activeCount), sub: `${overdueCount} overdue`, icon: Flame, color: 'text-primary' },
              { label: 'Completed', value: String(completedCount), sub: `${goals.length > 0 ? ((completedCount / goals.length) * 100).toFixed(0) : 0}% success`, icon: Trophy, color: 'text-accent' },
              { label: 'Avg. Progress', value: `${goals.length > 0 ? (goals.reduce((s, g) => s + (Number(g.current_amount || 0) / Number(g.target_amount)) * 100, 0) / goals.length).toFixed(0) : 0}%`, sub: 'across all goals', icon: TrendingUp, color: 'text-chart-4' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="stat-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{stat.label}</p>
                    <p className={cn('text-lg sm:text-2xl font-bold mt-1 truncate', stat.color)}>{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{stat.sub}</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                    <stat.icon className={cn('h-4 w-4', stat.color)} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Overall Progress Bar */}
        {goals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Portfolio Progress</p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-income">{formatCurrency(totalSaved)}</span>
                  <span className="text-sm text-muted-foreground">of {formatCurrency(totalTarget)}</span>
                </div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">{totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}%</span>
                  <span className="font-bold">{formatCurrency(totalTarget - totalSaved)} remaining</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0}%` }} transition={{ delay: 0.2, duration: 0.8 }} className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-income to-accent" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Tabs */}
        {goals.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Tabs defaultValue="distribution" className="stat-card">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="distribution" className="text-xs gap-1.5"><PieChartIcon className="h-3 w-3" />Distribution</TabsTrigger>
                <TabsTrigger value="comparison" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" />Comparison</TabsTrigger>
              </TabsList>
              <TabsContent value="distribution">
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
              <TabsContent value="comparison">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                      <Bar dataKey="saved" stackId="a" fill="hsl(var(--income))" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="remaining" stackId="a" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {/* Goals Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {processedGoals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: 0.15 + index * 0.06 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={cn('stat-card group cursor-default flex flex-col', goal.isCompleted && 'ring-1 ring-income/30', goal.isOverdue && 'ring-1 ring-expense/30')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
                      style={{ backgroundColor: `${goal.color || '#10B981'}15` }}
                    >
                      {goal.icon === 'shield' && '🛡️'}
                      {goal.icon === 'plane' && '✈️'}
                      {goal.icon === 'car' && '🚗'}
                      {goal.icon === 'home' && '🏠'}
                      {(goal.icon === 'target' || !goal.icon) && '🎯'}
                    </motion.div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold truncate">{goal.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {goal.isCompleted && <Badge variant="outline" className="text-[10px] h-5 border-income/30 text-income bg-income/10">Completed</Badge>}
                        {goal.isOverdue && <Badge variant="outline" className="text-[10px] h-5 border-expense/30 text-expense bg-expense/10">Overdue</Badge>}
                        {goal.urgency === 'urgent' && !goal.isCompleted && <Badge variant="outline" className="text-[10px] h-5 border-warning/30 text-warning bg-warning/10">Urgent</Badge>}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => { const a = prompt('How much to add?'); if (a) updateGoal.mutate({ id: goal.id, current_amount: Number(goal.current_amount || 0) + Number(a) }); }}>Add funds</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const a = prompt('How much to withdraw?'); if (a) updateGoal.mutate({ id: goal.id, current_amount: Math.max(0, Number(goal.current_amount || 0) - Number(a)) }); }}>Withdraw</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteGoal.mutate(goal.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {goal.deadline && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span className="truncate">Target: {format(new Date(goal.deadline), 'MMM yyyy')}</span>
                    {goal.daysRemaining !== null && goal.daysRemaining > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 bg-muted/50 rounded-md text-[10px] font-medium shrink-0">
                        {goal.daysRemaining}d left
                      </span>
                    )}
                  </p>
                )}

                <div className="space-y-2 mt-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold">{goal.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(goal.percentage, 100)}%` }}
                      transition={{ delay: 0.2 + index * 0.06, duration: 0.8 }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${goal.color || '#10B981'}, ${goal.color || '#10B981'}dd)` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-income truncate">{formatCurrency(Number(goal.current_amount || 0))}</span>
                    <span className="text-muted-foreground truncate">{formatCurrency(Number(goal.target_amount))}</span>
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
                  {goal.monthlyNeeded && goal.monthlyNeeded > 0 && (
                    <div className="p-2 rounded-lg bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Monthly</p>
                      <p className="text-xs font-bold truncate">{formatCurrency(goal.monthlyNeeded)}</p>
                    </div>
                  )}
                  {goal.weeklyNeeded && goal.weeklyNeeded > 0 && (
                    <div className="p-2 rounded-lg bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Weekly</p>
                      <p className="text-xs font-bold truncate">{formatCurrency(goal.weeklyNeeded)}</p>
                    </div>
                  )}
                  {(!goal.monthlyNeeded || goal.monthlyNeeded <= 0) && (
                    <div className="p-2 rounded-lg bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Remaining</p>
                      <p className="text-xs font-bold truncate">{formatCurrency(goal.remaining)}</p>
                    </div>
                  )}
                  {(!goal.weeklyNeeded || goal.weeklyNeeded <= 0) && (
                    <div className="p-2 rounded-lg bg-muted/30 text-center">
                      <p className="text-[10px] text-muted-foreground">Status</p>
                      <p className="text-xs font-bold">{goal.isCompleted ? '✅ Done' : '🔄 Active'}</p>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full mt-3"
                  variant="secondary"
                  size="sm"
                  onClick={() => { const a = prompt('How much to add?'); if (a) updateGoal.mutate({ id: goal.id, current_amount: Number(goal.current_amount || 0) + Number(a) }); }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Funds
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add New Goal Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="stat-card border-dashed border-2 flex flex-col items-center justify-center min-h-[280px] cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => setShowAddModal(true)}
          >
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <h3 className="font-bold mb-1">Create New Goal</h3>
            <p className="text-sm text-muted-foreground text-center">Set a target and start saving</p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Goals;
