import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, CreditCard, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useGoals } from '@/hooks/useGoals';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  amount: number;
  type: 'bill' | 'income' | 'goal';
  color: string;
}

export function FinancialCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: goals = [] } = useGoals();
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const events = useMemo(() => {
    const eventList: CalendarEvent[] = [];

    subscriptions.filter(s => s.is_active).forEach(sub => {
      const dueDate = new Date(sub.next_due);
      if (isSameMonth(dueDate, currentMonth)) {
        eventList.push({ id: `sub-${sub.id}`, date: dueDate, title: sub.name, amount: Number(sub.amount), type: 'bill', color: 'bg-expense' });
      }
    });

    goals.filter(g => g.deadline).forEach(goal => {
      const deadline = new Date(goal.deadline!);
      if (isSameMonth(deadline, currentMonth)) {
        eventList.push({ id: `goal-${goal.id}`, date: deadline, title: goal.name, amount: Number(goal.target_amount) - Number(goal.current_amount || 0), type: 'goal', color: 'bg-primary' });
      }
    });

    const incomeTransactions = transactions.filter(t => t.type === 'income' && t.is_recurring);
    const uniquePayees = new Set(incomeTransactions.map(t => t.payee).filter(Boolean));
    uniquePayees.forEach(payee => {
      const latestIncome = incomeTransactions.find(t => t.payee === payee);
      if (latestIncome) {
        const day = new Date(latestIncome.date).getDate();
        const expectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.min(day, monthEnd.getDate()));
        if (isSameMonth(expectedDate, currentMonth)) {
          eventList.push({ id: `income-${payee}`, date: expectedDate, title: payee || 'Recurring Income', amount: Number(latestIncome.amount), type: 'income', color: 'bg-income' });
        }
      }
    });

    return eventList;
  }, [subscriptions, goals, transactions, currentMonth, monthEnd]);

  const getEventsForDay = (day: Date) => events.filter(event => isSameDay(event.date, day));

  const summary = useMemo(() => {
    const bills = events.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);
    const income = events.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const goalDue = events.filter(e => e.type === 'goal').length;
    return { bills, income, goalDue };
  }, [events]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
      <Card className="stat-card group overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="font-semibold">Financial Calendar</span>
                <p className="text-[10px] text-muted-foreground font-normal">Bills, income & goals</p>
              </div>
            </CardTitle>
            <div className="flex items-center gap-0.5 bg-muted/40 rounded-xl p-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-semibold min-w-[72px] text-center tabular-nums">
                {format(currentMonth, 'MMM yyyy')}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: CreditCard, label: 'Bills', value: formatCurrency(summary.bills), color: 'text-expense', bg: 'from-expense/15 to-expense/5' },
              { icon: DollarSign, label: 'Income', value: formatCurrency(summary.income), color: 'text-income', bg: 'from-income/15 to-income/5' },
              { icon: Target, label: 'Goals', value: String(summary.goalDue), color: 'text-primary', bg: 'from-primary/15 to-primary/5' },
            ].map((item) => (
              <div key={item.label} className={cn('p-2.5 rounded-xl bg-gradient-to-br text-center border border-border/20', item.bg)}>
                <item.icon className={cn('h-3.5 w-3.5 mx-auto mb-1', item.color)} />
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p>
                <p className={cn('text-xs font-bold tabular-nums truncate', item.color)}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="space-y-[3px]">
            <div className="grid grid-cols-7 gap-[3px]">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-[3px]">
              {paddingDays.map((_, index) => <div key={`pad-${index}`} className="aspect-square" />)}

              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;
                const hasBill = dayEvents.some(e => e.type === 'bill');
                const hasIncome = dayEvents.some(e => e.type === 'income');
                const hasGoal = dayEvents.some(e => e.type === 'goal');
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <motion.button
                    key={day.toISOString()}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.008 }}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      'aspect-square rounded-[4px] border border-transparent transition-all duration-150 relative cursor-pointer flex flex-col items-center justify-center',
                      isToday(day) && 'bg-primary/10 ring-2 ring-primary ring-offset-1 ring-offset-background',
                      isSelected && !isToday(day) && 'bg-accent/20 ring-1 ring-accent',
                      hasEvents && !isToday(day) && !isSelected && 'bg-muted/30 hover:bg-muted/50',
                      !hasEvents && !isToday(day) && !isSelected && 'hover:bg-muted/20'
                    )}
                  >
                    <span className={cn(
                      'text-[10px] block text-center leading-none',
                      isToday(day) && 'font-bold text-primary',
                    )}>
                      {format(day, 'd')}
                    </span>
                    {hasEvents && (
                      <div className="flex gap-[2px] justify-center mt-0.5">
                        {hasBill && <div className="h-[4px] w-[4px] rounded-full bg-expense" />}
                        {hasIncome && <div className="h-[4px] w-[4px] rounded-full bg-income" />}
                        {hasGoal && <div className="h-[4px] w-[4px] rounded-full bg-primary" />}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center text-[9px]">
            {[
              { color: 'bg-expense', label: 'Bills' },
              { color: 'bg-income', label: 'Income' },
              { color: 'bg-primary', label: 'Goals' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className={cn('h-2 w-2 rounded-full', item.color)} />
                <span className="text-muted-foreground font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Selected day / Upcoming */}
          <AnimatePresence mode="wait">
            {selectedDay && selectedDayEvents.length > 0 ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 pt-3 border-t border-border/30"
              >
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{format(selectedDay, 'EEEE, MMM d')}</p>
                {selectedDayEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-muted/20 border border-border/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('h-2 w-2 rounded-full flex-shrink-0', event.color)} />
                      <span className="truncate font-medium">{event.title}</span>
                    </div>
                    <span className={cn(
                      'font-bold tabular-nums flex-shrink-0',
                      event.type === 'bill' && 'text-expense',
                      event.type === 'income' && 'text-income',
                      event.type === 'goal' && 'text-primary'
                    )}>
                      {formatCurrency(event.amount)}
                    </span>
                  </div>
                ))}
              </motion.div>
            ) : events.length > 0 && !selectedDay ? (
              <motion.div
                key="upcoming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5 pt-3 border-t border-border/30"
              >
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
                <div className="space-y-1 max-h-[80px] overflow-y-auto">
                  {events
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .slice(0, 3)
                    .map((event) => (
                      <div key={event.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-muted/20 border border-border/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn('h-2 w-2 rounded-full flex-shrink-0', event.color)} />
                          <span className="truncate font-medium">{event.title}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-muted-foreground tabular-nums">{format(event.date, 'MMM d')}</span>
                          <span className={cn(
                            'font-bold tabular-nums',
                            event.type === 'bill' && 'text-expense',
                            event.type === 'income' && 'text-income',
                            event.type === 'goal' && 'text-primary'
                          )}>
                            {formatCurrency(event.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
