import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, CreditCard, Target, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  // Get day of week for padding
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  // Generate calendar events
  const events = useMemo(() => {
    const eventList: CalendarEvent[] = [];

    // Add subscription due dates
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

    // Add goal deadlines
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

    // Add recurring income based on past transactions
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

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  // Calculate monthly summary
  const summary = useMemo(() => {
    const bills = events.filter(e => e.type === 'bill').reduce((sum, e) => sum + e.amount, 0);
    const income = events.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const goalDue = events.filter(e => e.type === 'goal').length;
    return { bills, income, goalDue };
  }, [events]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="stat-card">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="truncate">Financial Calendar</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[100px] text-center">
                {format(currentMonth, 'MMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monthly Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-expense/10">
              <CreditCard className="h-4 w-4 mx-auto text-expense mb-1" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">Bills Due</p>
              <p className="text-xs sm:text-sm font-semibold text-expense truncate" title={formatCurrency(summary.bills)}>
                {formatCurrency(summary.bills)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-income/10">
              <DollarSign className="h-4 w-4 mx-auto text-income mb-1" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">Expected Income</p>
              <p className="text-xs sm:text-sm font-semibold text-income truncate" title={formatCurrency(summary.income)}>
                {formatCurrency(summary.income)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">Goal Deadlines</p>
              <p className="text-xs sm:text-sm font-semibold text-primary">{summary.goalDue}</p>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1 sm:py-2">
                {day.slice(0, 1)}<span className="hidden sm:inline">{day.slice(1)}</span>
              </div>
            ))}
            
            {/* Padding days */}
            {paddingDays.map((_, index) => (
              <div key={`pad-${index}`} className="aspect-square" />
            ))}
            
            {/* Calendar days */}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              const hasBill = dayEvents.some(e => e.type === 'bill');
              const hasIncome = dayEvents.some(e => e.type === 'income');
              const hasGoal = dayEvents.some(e => e.type === 'goal');

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'aspect-square p-0.5 sm:p-1 rounded-md sm:rounded-lg border border-transparent transition-all relative',
                    isToday(day) && 'border-primary bg-primary/5',
                    hasEvents && 'bg-muted/30 hover:bg-muted/50 cursor-pointer'
                  )}
                  title={dayEvents.map(e => `${e.title}: ${formatCurrency(e.amount)}`).join('\n')}
                >
                  <span className={cn(
                    'text-[10px] sm:text-xs block text-center',
                    isToday(day) && 'font-bold text-primary'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap">
                      {hasBill && <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-expense" />}
                      {hasIncome && <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-income" />}
                      {hasGoal && <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 sm:gap-4 justify-center text-[10px] sm:text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-expense" />
              <span className="text-muted-foreground">Bills</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-income" />
              <span className="text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Goals</span>
            </div>
          </div>

          {/* Upcoming Events List */}
          {events.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground">Upcoming this month</p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {events
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .slice(0, 5)
                  .map(event => (
                    <div key={event.id} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn('h-2 w-2 rounded-full flex-shrink-0', event.color)} />
                        <span className="truncate">{event.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-muted-foreground">{format(event.date, 'MMM d')}</span>
                        <span className={cn(
                          'font-medium',
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
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
