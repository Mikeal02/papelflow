import { motion } from 'framer-motion';
import { Activity, Sparkles, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';

export const WelcomeHeader = memo(function WelcomeHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: stats } = useMonthlyStats();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const { greeting, emoji, currentDate, savingsRate, streakLabel, netWorth, txToday, topMover } = useMemo(() => {
    const hour = new Date().getHours();
    const isMorning = hour >= 6 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17 && hour < 21;

    const sr = stats && stats.income > 0
      ? Math.round(((stats.income - stats.expenses) / stats.income) * 100)
      : 0;

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayTx = transactions.filter(t => t.date?.startsWith(today)).length;
    const nw = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM');
    const byCat: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense' && t.date?.startsWith(monthStart)).forEach(t => {
      const k = (t as any).category?.name || 'Other';
      byCat[k] = (byCat[k] || 0) + Number(t.amount);
    });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

    return {
      greeting: isMorning ? 'Good morning' : isAfternoon ? 'Good afternoon' : isEvening ? 'Good evening' : 'Good night',
      emoji: isMorning ? '☀️' : isAfternoon ? '🌤️' : isEvening ? '🌅' : '🌙',
      currentDate: format(new Date(), 'EEEE, MMMM d'),
      savingsRate: sr,
      streakLabel: sr >= 30 ? 'Excellent saver' : sr >= 20 ? 'Great progress' : sr >= 10 ? 'Building momentum' : sr > 0 ? 'Getting started' : null,
      netWorth: nw,
      txToday: todayTx,
      topMover: top ? { name: top[0], amount: top[1] } : null,
    };
  }, [stats, accounts, transactions]);

  const tickerItems = [
    { label: 'Net Worth', value: formatCurrency(netWorth), icon: Sparkles, tone: 'primary' as const },
    { label: 'Income MTD', value: formatCurrency(stats?.income || 0), icon: TrendingUp, tone: 'income' as const },
    { label: 'Expenses MTD', value: formatCurrency(stats?.expenses || 0), icon: TrendingDown, tone: 'expense' as const },
    { label: 'Today', value: `${txToday} tx`, icon: Zap, tone: 'accent' as const },
    ...(topMover ? [{ label: `Top: ${topMover.name}`, value: formatCurrency(topMover.amount), icon: Activity, tone: 'warning' as const }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
   className="relative overflow-x-hidden overflow-y-hidden rounded-2xl border border-border/50 mesh-bg"
    >
      {/* Animated decorative orbs */}
      <motion.div
        aria-hidden
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl bg-primary/15"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full blur-3xl bg-accent/12"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.6, 0.4, 0.6] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 min-w-0">
          <div className="min-w-0 space-y-2">
            <p className="eyebrow-bar text-[11px] font-medium text-muted-foreground/80 uppercase tracking-[0.14em]">
              <span>{emoji}</span>
              <span>{currentDate}</span>
            </p>
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight overflow-hidden text-ellipsis">
              {greeting},{' '}
              <span className="holo-ticker font-semibold">{firstName}</span>
            </h1>
            <p className="text-sm text-muted-foreground/80 max-w-xl">
              Your financial cockpit is calibrated. Markets, budgets, and goals — synchronised in real time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {stats && stats.income > 20 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  'relative conic-ring flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-full',
                  savingsRate >= 20
                    ? 'bg-income/8 text-income'
                    : savingsRate >= 0
                      ? 'bg-warning/8 text-warning'
                      : 'bg-expense/8 text-expense'
                )}
              >
                <Activity className="h-3.5 w-3.5 shrink-0" />
                <span className="relative min-w-fit conic-ring flex items-center gap-2 flex-wrap text-xs font-medium px-3.5 py-2 rounded-full">{savingsRate >= 0 ? '+' : ''}{savingsRate}% saved</span>
              </motion.div>
            )}
            {streakLabel && savingsRate >= 20 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-full bg-primary/8 border border-primary/20 text-primary"
              >
                <Sparkles className="h-3 w-3" />
                {streakLabel}
              </motion.div>
            )}
          </div>
        </div>

        {/* Live ticker */}
        <div className="mt-5 overflow-hidden border-y border-border/40 bg-card/40 backdrop-blur-sm">
          <div className="marquee py-2.5">
            {[...tickerItems, ...tickerItems].map((it, i) => {
              const toneCls = it.tone === 'income' ? 'text-income' : it.tone === 'expense' ? 'text-expense' : it.tone === 'accent' ? 'text-accent' : it.tone === 'warning' ? 'text-warning' : 'text-primary';
              return (
                <div key={i} className="flex items-center gap-2 px-5 whitespace-nowrap text-[12px]">
                  <it.icon className={cn('h-3.5 w-3.5', toneCls)} />
                  <span className="text-muted-foreground/70 uppercase tracking-wider text-[10px]">{it.label}</span>
                  <span className={cn('font-semibold tnum', toneCls)}>{it.value}</span>
                  <span className="text-border">•</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
