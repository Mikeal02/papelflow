import { motion } from 'framer-motion';
import { Calendar, Sparkles, TrendingUp, Sun, Moon, Coffee, Star, Zap, Activity, Flame } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ShineEffect } from '@/components/ui/glowing-border';
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
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="relative overflow-hidden rounded-3xl p-6 md:p-7 border border-border/30"
      style={{
        background: `linear-gradient(145deg, 
          hsl(var(--card) / 0.98) 0%, 
          hsl(var(--card) / 0.92) 40%,
          hsl(var(--card) / 0.88) 100%)`,
        boxShadow: '0 12px 40px -12px hsl(var(--primary) / 0.08), 0 4px 16px -4px hsl(var(--foreground) / 0.03), inset 0 1px 0 hsl(0 0% 100% / 0.08)',
      }}
    >
      {/* Static gradient orbs — no JS animation loops */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/15 via-chart-6/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(hsl(var(--primary)) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div
              className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center text-primary-foreground shadow-xl shrink-0"
              style={{ boxShadow: '0 8px 30px -4px hsl(var(--primary) / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.2)' }}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
                <span className="gradient-text">{greeting}</span>
                <span className="text-foreground">, {firstName}</span>
              </h1>
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="h-0.5 bg-gradient-to-r from-primary via-accent to-transparent rounded-full"
              />
            </div>
            <Badge variant="outline" className="hidden sm:flex gap-1.5 text-[10px] font-semibold border-income/40 text-income bg-income/10 shrink-0 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-income animate-pulse" />
              Live
            </Badge>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-2.5 text-sm text-muted-foreground"
          >
            <randomQuote.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="italic truncate font-medium">"{randomQuote.text}"</span>
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3 shrink-0"
        >
          {stats && (
            <div
              className={cn(
                "hidden md:flex items-center gap-2 text-xs font-semibold px-3.5 py-2.5 rounded-xl border backdrop-blur-sm",
                savingsRate >= 20 
                  ? "bg-income/10 border-income/30 text-income" 
                  : savingsRate >= 0 
                    ? "bg-warning/10 border-warning/30 text-warning"
                    : "bg-expense/10 border-expense/30 text-expense"
              )}
            >
              <Activity className="h-4 w-4" />
              <span>{savingsRate >= 0 ? '+' : ''}{savingsRate}% saved</span>
            </div>
          )}
          
          <ShineEffect>
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground bg-card/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-border/40 shadow-soft">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold hidden sm:inline">{currentDate}</span>
              <span className="text-lg sm:hidden">{emoji}</span>
            </div>
          </ShineEffect>
        </motion.div>
      </div>
    </motion.div>
  );
});
