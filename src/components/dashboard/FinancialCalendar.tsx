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
        eventList.push({
          id: `sub-${sub.id}`,
          date: dueDate,
          title: sub.name,
          amount: Number(sub.amount),
          type: 'bill',
          color: 'bg-expense',
        });
      }
    });

    goals.filter(g => g.deadline).forEach(goal => {
      const deadline = new Date(goal.deadline!);
      if (isSameMonth(deadline, currentMonth)) {
        eventList.push({
          id: `goal-${goal.id}`,
          date: deadline,
          title: goal.name,
          amount: Number(goal.target_amount) - Number(goal.current_amount || 0),
          type: 'goal',
          color: 'bg-primary',
        });
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
          eventList.push({
            id: `income-${payee}`,
            date: expectedDate,
            title: payee || 'Recurring Income',
            amount: Number(latestIncome.amount),
            type: 'income',
            color: 'bg-income',
          });
        }
      }
    });

    return eventList;
  }, [subscriptions, goals, transactions, currentMonth, monthEnd]);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  const summary = useMemo(() => {
    const bills = events.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);
    const income = events.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const goalDue = events.filter(e => e.type === 'goal').length;
    return { bills, income, goalDue };
  }, [events]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card className="stat-card group">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base md:text-lg flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">Financial Calendar</span>
            </CardTitle>
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-background"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[90px] text-center">
                {format(currentMonth, 'MMM yyyy')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-background"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monthly Summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: CreditCard, label: 'Bills Due', value: formatCurrency(summary.bills), color: 'expense', bg: 'from-expense/20 to-expense/10' },
              { icon: DollarSign, label: 'Expected', value: formatCurrency(summary.income), color: 'income', bg: 'from-income/20 to-income/10' },
              { icon: Target, label: 'Goals', value: String(summary.goalDue), color: 'primary', bg: 'from-primary/20 to-primary/10' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                className={cn(
                  'p-2.5 rounded-xl bg-gradient-to-br text-center group/item hover:scale-105 transition-transform cursor-default',
                  item.bg
                )}
              >
                <item.icon className={cn('h-4 w-4 mx-auto mb-1', `text-${item.color}`)} />
                <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
                <p className={cn('text-xs font-bold truncate', `text-${item.color}`)}>
                  {item.value}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
            
            {paddingDays.map((_, index) => (
              <div key={`pad-${index}`} className="aspect-square" />
            ))}
            
            <AnimatePresence mode="popLayout">
              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;
                const hasBill = dayEvents.some(e => e.type === 'bill');
                const hasIncome = dayEvents.some(e => e.type === 'income');
                const hasGoal = dayEvents.some(e => e.type === 'goal');

                return (
                  <motion.div
                    key={day.toISOString()}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.01 }}
                    className={cn(
                      'aspect-square p-0.5 rounded-lg border border-transparent transition-all duration-200 relative cursor-pointer',
                      isToday(day) && 'bg-primary/10 border-primary/30 ring-1 ring-primary/20',
                      hasEvents && !isToday(day) && 'bg-muted/40 hover:bg-muted/60 hover:border-border',
                      !hasEvents && !isToday(day) && 'hover:bg-muted/30'
                    )}
                    title={dayEvents.map(e => `${e.title}: ${formatCurrency(e.amount)}`).join('\n')}
                  >
                    <span className={cn(
                      'text-[10px] sm:text-xs block text-center leading-relaxed',
                      isToday(day) && 'font-bold text-primary'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {hasEvents && (
                      <div className="flex gap-0.5 justify-center mt-0.5">
                        {hasBill && <div className="h-1 w-1 rounded-full bg-expense animate-pulse" />}
                        {hasIncome && <div className="h-1 w-1 rounded-full bg-income" />}
                        {hasGoal && <div className="h-1 w-1 rounded-full bg-primary" />}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center text-[10px] pt-1">
            {[
              { color: 'bg-expense', label: 'Bills' },
              { color: 'bg-income', label: 'Income' },
              { color: 'bg-primary', label: 'Goals' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', item.color)} />
                <span className="text-muted-foreground font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Upcoming Events */}
          {events.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-2 pt-3 border-t border-border/50"
            >
              <p className="text-xs font-semibold text-muted-foreground">Upcoming</p>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                {events
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .slice(0, 4)
                  .map((event, index) => (
                    <motion.div 
                      key={event.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + index * 0.05 }}
                      className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn('h-2 w-2 rounded-full flex-shrink-0', event.color)} />
                        <span className="truncate font-medium">{event.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-muted-foreground">{format(event.date, 'MMM d')}</span>
                        <span className={cn(
                          'font-bold',
                          event.type === 'bill' && 'text-expense',
                          event.type === 'income' && 'text-income',
                          event.type === 'goal' && 'text-primary'
                        )}>
                          {formatCurrency(event.amount)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
