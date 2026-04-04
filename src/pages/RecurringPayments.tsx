import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock, Plus, Clock, CheckCircle2, AlertTriangle, XCircle,
  DollarSign, CreditCard, Repeat, ArrowRight, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Timer, TrendingUp, Bell, History, Filter,
  Zap, Calendar as CalendarIcon
} from 'lucide-react';

import { PageTransition } from '@/components/layout/PageTransition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubscriptions, useUpdateSubscription } from '@/hooks/useSubscriptions';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, isBefore, addWeeks, addYears, differenceInDays,
  getDay, parseISO, startOfWeek, endOfWeek
} from 'date-fns';

type PaymentStatus = 'paid' | 'upcoming' | 'overdue' | 'due-today';

interface CalendarPayment {
  id: string;
  name: string;
  amount: number;
  date: Date;
  status: PaymentStatus;
  frequency: string;
  categoryName?: string;
  accountName?: string;
  isAutoPay: boolean;
}

export default function RecurringPayments() {
  const { formatCurrency } = useCurrency();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const updateSubscription = useUpdateSubscription();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Build payment calendar data
  const calendarData = useMemo(() => {
    const payments: CalendarPayment[] = [];
    const active = subscriptions.filter(s => s.is_active);

    active.forEach(sub => {
      const cat = categories.find(c => c.id === sub.category_id);
      const acc = accounts.find(a => a.id === sub.account_id);
      let nextDue = parseISO(sub.next_due);

      // Generate occurrences for visible month range (prev, current, next)
      const rangeStart = subMonths(monthStart, 1);
      const rangeEnd = addMonths(monthEnd, 1);

      // Walk backwards to find first occurrence before range
      let checkDate = nextDue;
      while (isBefore(rangeStart, checkDate)) {
        const prev = sub.frequency === 'weekly' ? subMonths(checkDate, 0) : subMonths(checkDate, sub.frequency === 'monthly' ? 1 : 12);
        if (isBefore(prev, subMonths(rangeStart, 13))) break;
        checkDate = prev;
      }

      // Now walk forward generating occurrences
      let current = parseISO(sub.next_due);
      // Generate for current and next few occurrences
      for (let i = 0; i < 12; i++) {
        if (isBefore(rangeEnd, current)) break;

        const isPaid = transactions.some(t =>
          t.is_recurring &&
          t.payee === sub.name &&
          format(new Date(t.date), 'yyyy-MM') === format(current, 'yyyy-MM')
        );

        let status: PaymentStatus = 'upcoming';
        if (isPaid) status = 'paid';
        else if (isToday(current)) status = 'due-today';
        else if (isBefore(current, today)) status = 'overdue';

        payments.push({
          id: `${sub.id}-${format(current, 'yyyy-MM-dd')}`,
          name: sub.name,
          amount: Number(sub.amount),
          date: current,
          status,
          frequency: sub.frequency,
          categoryName: cat?.name,
          accountName: acc?.name,
          isAutoPay: true,
        });

        current = sub.frequency === 'weekly'
          ? addWeeks(current, 1)
          : sub.frequency === 'yearly'
            ? addYears(current, 1)
            : addMonths(current, 1);
      }
    });

    return payments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [subscriptions, transactions, categories, accounts, monthStart, monthEnd, today]);

  // Filter payments for current month
  const monthPayments = calendarData.filter(p => isSameMonth(p.date, currentMonth));
  const filteredPayments = filterStatus === 'all' ? monthPayments : monthPayments.filter(p => p.status === filterStatus);

  // Stats
  const stats = useMemo(() => {
    const mp = monthPayments;
    const totalDue = mp.reduce((s, p) => s + p.amount, 0);
    const paid = mp.filter(p => p.status === 'paid');
    const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
    const overdue = mp.filter(p => p.status === 'overdue');
    const totalOverdue = overdue.reduce((s, p) => s + p.amount, 0);
    const upcoming = mp.filter(p => p.status === 'upcoming' || p.status === 'due-today');
    const totalUpcoming = upcoming.reduce((s, p) => s + p.amount, 0);
    const autoPay = mp.filter(p => p.isAutoPay).length;
    const paidPercent = mp.length > 0 ? (paid.length / mp.length) * 100 : 0;

    return { totalDue, totalPaid, totalOverdue, totalUpcoming, overdue: overdue.length, upcoming: upcoming.length, paid: paid.length, total: mp.length, autoPay, paidPercent };
  }, [monthPayments]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  // Payment history timeline (last 3 months of recurring transactions)
  const paymentHistory = useMemo(() => {
    const threeMonthsAgo = subMonths(today, 3);
    return transactions
      .filter(t => t.is_recurring && new Date(t.date) >= threeMonthsAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
  }, [transactions, today]);

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="h-3.5 w-3.5 text-income" />;
      case 'overdue': return <XCircle className="h-3.5 w-3.5 text-expense" />;
      case 'due-today': return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
      case 'upcoming': return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const map = {
      paid: { label: 'Paid', className: 'bg-income/10 text-income border-income/20' },
      overdue: { label: 'Overdue', className: 'bg-expense/10 text-expense border-expense/20' },
      'due-today': { label: 'Due Today', className: 'bg-warning/10 text-warning border-warning/20' },
      upcoming: { label: 'Upcoming', className: 'bg-muted text-muted-foreground border-border' },
    };
    const s = map[status];
    return <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', s.className)}>{s.label}</Badge>;
  };

  const dayPayments = (day: Date) => calendarData.filter(p => isSameDay(p.date, day));

  return (
    <>
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center border border-border/30">
                <Repeat className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Recurring Payments</h1>
                <p className="text-sm text-muted-foreground">Track scheduled payments, auto-pay, and history</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="min-w-[140px]" onClick={() => setCurrentMonth(new Date())}>
                <CalendarIcon className="h-4 w-4 mr-1.5" />
                {format(currentMonth, 'MMMM yyyy')}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* KPIs */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Total Due', value: formatCurrency(stats.totalDue), icon: DollarSign, color: 'text-primary', sub: `${stats.total} payments` },
              { label: 'Paid', value: formatCurrency(stats.totalPaid), icon: CheckCircle2, color: 'text-income', sub: `${stats.paid} of ${stats.total}` },
              { label: 'Overdue', value: formatCurrency(stats.totalOverdue), icon: XCircle, color: 'text-expense', sub: `${stats.overdue} payments` },
              { label: 'Upcoming', value: formatCurrency(stats.totalUpcoming), icon: Clock, color: 'text-warning', sub: `${stats.upcoming} pending` },
              { label: 'Auto-Pay', value: `${stats.autoPay}`, icon: Zap, color: 'text-accent', sub: 'Active schedules' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="stat-card p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={cn('h-4 w-4', kpi.color)} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className={cn('text-lg font-bold', kpi.color)}>{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Progress bar */}
          <Card className="glass-card border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Monthly Payment Progress</span>
                <span className="text-sm font-mono text-muted-foreground">{stats.paidPercent.toFixed(0)}% complete</span>
              </div>
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-income to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.paidPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{formatCurrency(stats.totalPaid)} paid</span>
                <span>{formatCurrency(stats.totalDue - stats.totalPaid)} remaining</span>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calendar">Payment Calendar</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="history">Payment History</TabsTrigger>
            </TabsList>

            {/* CALENDAR TAB */}
            <TabsContent value="calendar" className="space-y-4">
              <Card className="glass-card border-border/30">
                <CardContent className="p-4">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map(day => {
                      const payments = dayPayments(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isSelected = selectedDay && isSameDay(day, selectedDay);
                      const hasOverdue = payments.some(p => p.status === 'overdue');
                      const hasDueToday = payments.some(p => p.status === 'due-today');

                      return (
                        <motion.button
                          key={day.toISOString()}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={cn(
                            'relative aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all text-xs',
                            !isCurrentMonth && 'opacity-30',
                            isToday(day) && 'ring-1 ring-primary/50',
                            isSelected && 'bg-primary/10 ring-1 ring-primary',
                            payments.length > 0 && !isSelected && 'bg-muted/50',
                            hasOverdue && 'bg-expense/5',
                            hasDueToday && !isSelected && 'bg-warning/5',
                          )}
                        >
                          <span className={cn(
                            'font-medium mt-0.5',
                            isToday(day) ? 'text-primary font-bold' : 'text-foreground',
                          )}>
                            {format(day, 'd')}
                          </span>
                          {payments.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                              {payments.slice(0, 3).map(p => (
                                <div
                                  key={p.id}
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    p.status === 'paid' && 'bg-income',
                                    p.status === 'overdue' && 'bg-expense',
                                    p.status === 'due-today' && 'bg-warning',
                                    p.status === 'upcoming' && 'bg-primary/50',
                                  )}
                                />
                              ))}
                              {payments.length > 3 && (
                                <span className="text-[8px] text-muted-foreground">+{payments.length - 3}</span>
                              )}
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/30">
                    {[
                      { color: 'bg-income', label: 'Paid' },
                      { color: 'bg-warning', label: 'Due Today' },
                      { color: 'bg-expense', label: 'Overdue' },
                      { color: 'bg-primary/50', label: 'Upcoming' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5">
                        <div className={cn('h-2 w-2 rounded-full', l.color)} />
                        <span className="text-[11px] text-muted-foreground">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Selected day detail */}
              <AnimatePresence>
                {selectedDay && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="glass-card border-border/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</CardTitle>
                        <CardDescription>{dayPayments(selectedDay).length} payment(s)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {dayPayments(selectedDay).length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No payments on this day</p>
                        ) : (
                          dayPayments(selectedDay).map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/20">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(p.status)}
                                <div>
                                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">{p.categoryName || 'Uncategorized'}</span>
                                    {p.isAutoPay && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-accent border-accent/20">
                                        <Zap className="h-2.5 w-2.5 mr-0.5" />Auto
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-mono font-semibold text-foreground">{formatCurrency(p.amount)}</p>
                                {getStatusBadge(p.status)}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* SCHEDULE TAB */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="due-today">Due Today</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {filteredPayments.length === 0 ? (
                  <Card className="glass-card border-border/30">
                    <CardContent className="p-8 text-center">
                      <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No payments found for this filter</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPayments.map((payment, i) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Card className={cn(
                        'glass-card border-border/30 transition-all hover:shadow-medium',
                        payment.status === 'overdue' && 'border-expense/20',
                        payment.status === 'due-today' && 'border-warning/20',
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Date badge */}
                            <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-muted/50 shrink-0">
                              <span className="text-[10px] uppercase text-muted-foreground font-medium">{format(payment.date, 'MMM')}</span>
                              <span className="text-lg font-bold text-foreground leading-none">{format(payment.date, 'd')}</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground truncate">{payment.name}</span>
                                {getStatusBadge(payment.status)}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Repeat className="h-3 w-3" />
                                  {payment.frequency}
                                </span>
                                {payment.categoryName && (
                                  <span>{payment.categoryName}</span>
                                )}
                                {payment.accountName && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {payment.accountName}
                                  </span>
                                )}
                                {payment.isAutoPay && (
                                  <span className="flex items-center gap-1 text-accent">
                                    <Zap className="h-3 w-3" />
                                    Auto-Pay
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right shrink-0">
                              <p className="text-base font-mono font-bold text-foreground">{formatCurrency(payment.amount)}</p>
                              {payment.status === 'overdue' && (
                                <p className="text-[10px] text-expense">{differenceInDays(today, payment.date)}d overdue</p>
                              )}
                              {payment.status === 'upcoming' && (
                                <p className="text-[10px] text-muted-foreground">in {differenceInDays(payment.date, today)}d</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* HISTORY TAB */}
            <TabsContent value="history" className="space-y-4">
              <Card className="glass-card border-border/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Payment History Timeline
                  </CardTitle>
                  <CardDescription>Recent recurring payment activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No recurring payment history yet</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                      <div className="space-y-1">
                        {paymentHistory.map((tx, i) => {
                          const cat = categories.find(c => c.id === tx.category_id);
                          const acc = accounts.find(a => a.id === tx.account_id);
                          const prevDate = i > 0 ? paymentHistory[i - 1].date : null;
                          const showDateHeader = !prevDate || format(new Date(tx.date), 'yyyy-MM-dd') !== format(new Date(prevDate), 'yyyy-MM-dd');

                          return (
                            <div key={tx.id}>
                              {showDateHeader && (
                                <div className="flex items-center gap-3 py-2 ml-10">
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    {format(new Date(tx.date), 'EEEE, MMM d, yyyy')}
                                  </span>
                                </div>
                              )}
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center gap-3 py-2"
                              >
                                {/* Timeline dot */}
                                <div className="relative z-10 flex items-center justify-center h-10 w-10 shrink-0">
                                  <div className="h-3 w-3 rounded-full bg-income border-2 border-background" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/20">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{tx.payee || 'Payment'}</p>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                      {cat && <span>{cat.name}</span>}
                                      {acc && <span>• {acc.name}</span>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-mono font-semibold text-expense">-{formatCurrency(Number(tx.amount))}</p>
                                    <p className="text-[10px] text-muted-foreground">{format(new Date(tx.date), 'h:mm a')}</p>
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      
    </>
  );
}
