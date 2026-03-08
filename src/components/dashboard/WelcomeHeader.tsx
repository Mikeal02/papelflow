import { motion } from 'framer-motion';
import { Calendar, Sparkles, TrendingUp, Sun, Moon, Coffee, Star, Zap, Activity } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ShineEffect } from '@/components/ui/glowing-border';
import { useMonthlyStats } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';

export function WelcomeHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: stats } = useMonthlyStats();
  const { formatCurrency } = useCurrency();
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const hour = new Date().getHours();
  const isMorning = hour >= 6 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 || hour < 6;
  
  const greeting = isMorning ? 'Good morning' : isAfternoon ? 'Good afternoon' : 'Good evening';
  const Icon = isMorning ? Sun : isAfternoon ? Coffee : Moon;
  const emoji = isMorning ? '🌅' : isAfternoon ? '☀️' : '🌙';

  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  const motivationalQuotes = [
    { text: "Every dollar saved is a step closer to freedom", icon: Star },
    { text: "Smart spending today, wealthy tomorrow", icon: TrendingUp },
    { text: "Your financial journey is looking great!", icon: Sparkles },
    { text: "Building wealth one decision at a time", icon: Zap },
  ];
  
  const randomQuote = motivationalQuotes[Math.floor(Date.now() / 86400000) % motivationalQuotes.length];

  const savingsRate = stats && stats.income > 0
    ? Math.round(((stats.income - stats.expenses) / stats.income) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl p-5 aurora-bg border border-border/50"
    >
      {/* Animated gradient orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none animate-float" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-chart-6/5 rounded-full blur-[60px] pointer-events-none" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shrink-0"
              style={{ boxShadow: '0 4px 20px hsl(var(--primary) / 0.3)' }}
            >
              <Icon className="h-5 w-5" />
            </motion.div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
                <span className="gradient-text">{greeting}</span>, {firstName}
              </h1>
            </div>
            <Badge variant="outline" className="hidden sm:flex gap-1 text-[10px] font-medium border-income/30 text-income bg-income/5 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-income animate-pulse" />
              Live
            </Badge>
          </motion.div>
          
          {/* Motivational quote */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <randomQuote.icon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="italic truncate">"{randomQuote.text}"</span>
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 shrink-0"
        >
          {/* Mini savings rate pill */}
          {stats && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="hidden md:flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-muted/30 border border-border/30"
            >
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className={savingsRate >= 0 ? 'text-income' : 'text-expense'}>
                {savingsRate}% saved
              </span>
            </motion.div>
          )}
          
          <ShineEffect>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/30">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium hidden sm:inline">{currentDate}</span>
              <span className="font-medium sm:hidden">{emoji}</span>
            </div>
          </ShineEffect>
        </motion.div>
      </div>
    </motion.div>
  );
}
