import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  CalendarRange,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Command,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, RangeCalendar } from '@/components/ui/calendar-rac';
import {
  getLocalTimeZone,
  today,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  CalendarDate,
} from '@internationalized/date';
import type { DateValue } from 'react-aria-components';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

type RangeVal = { start: DateValue; end: DateValue } | null;

const toISO = (d: DateValue) =>
  `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

export default function CalendarPage() {
  const now = today(getLocalTimeZone());
  const [date, setDate] = useState<DateValue>(now);
  const [range, setRange] = useState<RangeVal>({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });

  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  // Keyboard shortcuts: T=today, M=this month, W=this week
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA/)) return;
      if (e.key === 't' || e.key === 'T') setDate(now);
      if (e.key === 'w' || e.key === 'W')
        setRange({ start: startOfWeek(now, 'en-US'), end: now });
      if (e.key === 'm' || e.key === 'M')
        setRange({ start: startOfMonth(now), end: endOfMonth(now) });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [now]);

  // Selected day activity
  const dayTx = useMemo(() => {
    const iso = toISO(date);
    return transactions.filter((t: any) => (t.date || '').startsWith(iso));
  }, [transactions, date]);

  const dayStats = useMemo(() => {
    let income = 0,
      expense = 0;
    dayTx.forEach((t: any) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else if (t.type === 'expense') expense += amt;
    });
    return { income, expense, net: income - expense, count: dayTx.length };
  }, [dayTx]);

  // Range aggregation
  const rangeStats = useMemo(() => {
    if (!range) return { income: 0, expense: 0, net: 0, count: 0, byDay: 0 };
    const startISO = toISO(range.start);
    const endISO = toISO(range.end);
    const inRange = transactions.filter(
      (t: any) => (t.date || '') >= startISO && (t.date || '') <= endISO,
    );
    let income = 0,
      expense = 0;
    inRange.forEach((t: any) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else if (t.type === 'expense') expense += amt;
    });
    const days = Math.max(
      1,
      Math.round(
        (new Date(endISO).getTime() - new Date(startISO).getTime()) / 86400000,
      ) + 1,
    );
    return {
      income,
      expense,
      net: income - expense,
      count: inRange.length,
      byDay: expense / days,
      days,
    };
  }, [transactions, range]);

  const presets: { label: string; run: () => void }[] = [
    { label: 'Today', run: () => setRange({ start: now, end: now }) },
    {
      label: 'This Week',
      run: () => setRange({ start: startOfWeek(now, 'en-US'), end: now }),
    },
    {
      label: 'This Month',
      run: () => setRange({ start: startOfMonth(now), end: endOfMonth(now) }),
    },
    {
      label: 'Last 7 Days',
      run: () => setRange({ start: now.subtract({ days: 6 }), end: now }),
    },
    {
      label: 'Last 30 Days',
      run: () => setRange({ start: now.subtract({ days: 29 }), end: now }),
    },
    {
      label: 'Last 90 Days',
      run: () => setRange({ start: now.subtract({ days: 89 }), end: now }),
    },
    {
      label: 'Year to Date',
      run: () =>
        setRange({
          start: new CalendarDate(now.year, 1, 1),
          end: now,
        }),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/40 mesh-bg p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest">
              <Sparkles className="h-3 w-3 text-primary" />
              Temporal Console
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">
              Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              High-fidelity date selection with live financial context, range
              analytics, and keyboard-first navigation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <Command className="h-3 w-3" />
              <kbd className="text-[10px]">T</kbd> today
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <kbd className="text-[10px]">W</kbd> week
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <kbd className="text-[10px]">M</kbd> month
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Single Date + Day Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="stat-card lg:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Single Date
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setDate(now)}
            >
              Jump to today
            </Button>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar value={date} onChange={(d) => d && setDate(d)} />
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Day Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {date.toDate(getLocalTimeZone()).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat
                icon={<TrendingUp className="h-3 w-3" />}
                label="In"
                value={formatCurrency(dayStats.income)}
                tone="pos"
              />
              <MiniStat
                icon={<TrendingDown className="h-3 w-3" />}
                label="Out"
                value={formatCurrency(dayStats.expense)}
                tone="neg"
              />
              <MiniStat
                icon={<Wallet className="h-3 w-3" />}
                label="Net"
                value={formatCurrency(dayStats.net)}
                tone={dayStats.net >= 0 ? 'pos' : 'neg'}
              />
            </div>
            <Separator />
            <ScrollArea className="h-[220px] pr-2">
              {dayTx.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center mb-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No transactions on this day
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {dayTx.slice(0, 20).map((t: any) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.description || t.category?.name || 'Transaction'}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {t.account?.name || '—'} ·{' '}
                          {t.category?.name || t.type}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums shrink-0',
                          t.type === 'income'
                            ? 'text-emerald-500'
                            : t.type === 'expense'
                              ? 'text-rose-500'
                              : 'text-muted-foreground',
                        )}
                      >
                        {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                        {formatCurrency(Number(t.amount) || 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Range + Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="stat-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <RangeCalendar
              value={range as any}
              onChange={(r) => setRange(r as any)}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="stat-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Presets</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={p.run}
                >
                  {p.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Range Summary
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {range
                  ? `${toISO(range.start)} → ${toISO(range.end)} · ${rangeStats.days} days`
                  : 'No range selected'}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <SummaryRow
                label="Income"
                value={formatCurrency(rangeStats.income)}
                tone="pos"
              />
              <SummaryRow
                label="Expenses"
                value={formatCurrency(rangeStats.expense)}
                tone="neg"
              />
              <SummaryRow
                label="Net"
                value={formatCurrency(rangeStats.net)}
                tone={rangeStats.net >= 0 ? 'pos' : 'neg'}
                bold
              />
              <Separator className="my-2" />
              <SummaryRow
                label="Transactions"
                value={String(rangeStats.count)}
              />
              <SummaryRow
                label="Avg / Day"
                value={formatCurrency(rangeStats.byDay || 0)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'pos' | 'neg';
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'text-sm font-semibold tabular-nums mt-0.5 truncate',
          tone === 'pos' && 'text-emerald-500',
          tone === 'neg' && 'text-rose-500',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone?: 'pos' | 'neg';
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          bold && 'font-semibold',
          tone === 'pos' && 'text-emerald-500',
          tone === 'neg' && 'text-rose-500',
        )}
      >
        {value}
      </span>
    </div>
  );
}
