import { motion } from 'framer-motion';
import { Calendar, Sparkles, TrendingUp, Sun, Moon, Coffee, Star, Zap, Activity, Flame, Shield } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useMonthlyStats } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';

export const WelcomeHeader = memo(function WelcomeHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: stats } = useMonthlyStats();
  const { formatCurrency } = useCurrency();
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const { greeting, Icon, emoji, currentDate, randomQuote, savingsRate } = useMemo(() => {
    const hour = new Date().getHours();
    const isMorning = hour >= 6 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;

    const quotes = [
      { text: "Every dollar saved is a step closer to freedom", icon: Star },
      { text: "Smart spending today, wealthy tomorrow", icon: TrendingUp },
      { text: "Your financial journey is looking great!", icon: Sparkles },
      { text: "Building wealth one decision at a time", icon: Zap },
      { text: "Financial freedom is within reach", icon: Flame },
    ];

    return {
      greeting: isMorning ? 'Good morning' : isAfternoon ? 'Good afternoon' : 'Good evening',
      Icon: isMorning ? Sun : isAfternoon ? Coffee : Moon,
      emoji: isMorning ? '🌅' : isAfternoon ? '☀️' : '🌙',
      currentDate: format(new Date(), 'EEEE, MMMM d, yyyy'),
      randomQuote: quotes[Math.floor(Date.now() / 86400000) % quotes.length],
      savingsRate: stats && stats.income > 0
        ? Math.round(((stats.income - stats.expenses) / stats.income) * 100)
        : 0,
    };
  }, [stats]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl p-6 md:p-7 border border-border/20"
      style={{
        background: `linear-gradient(135deg, 
          hsl(var(--card) / 0.95) 0%, 
          hsl(var(--card) / 0.85) 100%)`,
        boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.06)',
      }}
    >
      {/* Minimal ambient — no JS loops */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 space-y-2.5">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shrink-0"
              style={{ boxShadow: '0 6px 20px -4px hsl(var(--primary) / 0.35)' }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-[28px] font-bold tracking-tight leading-tight">
                <span className="gradient-text">{greeting}</span>
                <span className="text-foreground">, {firstName}</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="h-[18px] gap-1 text-[9px] font-bold border-income/30 text-income bg-income/8 px-2">
                  <span className="h-1 w-1 rounded-full bg-income animate-pulse" />
                  LIVE
                </Badge>
                <span className="text-[11px] text-muted-foreground/50">•</span>
                <span className="text-[11px] text-muted-foreground/50 font-medium">{currentDate}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground/60 pl-14">
            <randomQuote.icon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <span className="italic truncate">"{randomQuote.text}"</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0">
          {stats && stats.income > 20 && (
            <div
              className={cn(
                "hidden md:flex items-center gap-2 text-[11px] font-semibold px-3 py-2 rounded-xl border",
                savingsRate >= 20 
                  ? "bg-income/8 border-income/20 text-income" 
                  : savingsRate >= 0 
                    ? "bg-warning/8 border-warning/20 text-warning"
                    : "bg-expense/8 border-expense/20 text-expense"
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>{savingsRate >= 0 ? '+' : ''}{savingsRate}% saved</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
