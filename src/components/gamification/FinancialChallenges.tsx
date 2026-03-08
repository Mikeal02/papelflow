import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Star, Zap, Target, Lock, CheckCircle2, Clock, TrendingUp, Gift, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTransactions, useMonthlyStats } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { differenceInDays, subDays, format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  type: 'daily' | 'weekly' | 'monthly' | 'milestone';
  progress: number;
  target: number;
  reward: string;
  status: 'locked' | 'active' | 'completed';
  xp: number;
}

interface AchievementBadge {
  id: string;
  name: string;
  icon: typeof Trophy;
  description: string;
  earned: boolean;
  earnedDate?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

const tierColors = {
  bronze: 'from-amber-700 to-amber-500',
  silver: 'from-slate-400 to-slate-300',
  gold: 'from-yellow-500 to-amber-400',
  platinum: 'from-violet-400 to-indigo-300',
};

const tierBg = {
  bronze: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  silver: 'bg-slate-400/10 text-slate-600 dark:text-slate-300',
  gold: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  platinum: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
};

export const FinancialChallenges = () => {
  const [activeTab, setActiveTab] = useState<'challenges' | 'badges' | 'streaks'>('challenges');
  const { data: transactions = [] } = useTransactions();
  const { data: stats } = useMonthlyStats();
  const { data: goals = [] } = useGoals();
  const { data: budgets = [] } = useBudgets();
  const { data: accounts = [] } = useAccounts();
  const { formatCurrency } = useCurrency();

  // Calculate streaks
  const { currentStreak, longestStreak, totalXP } = useMemo(() => {
    const today = new Date();
    let streak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Check consecutive days with transactions logged
    for (let i = 0; i < 365; i++) {
      const day = format(subDays(today, i), 'yyyy-MM-dd');
      const hasTx = transactions.some(t => t.date === day);
      if (hasTx) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
        if (i === 0 || streak === tempStreak - 1) streak = tempStreak;
      } else {
        if (i === 0) continue; // Today might not have transactions yet
        tempStreak = 0;
      }
    }

    // XP from various activities
    const xp = transactions.length * 10 + goals.length * 50 + budgets.length * 30 + accounts.length * 20 + streak * 5;

    return { currentStreak: streak, longestStreak: maxStreak, totalXP: xp };
  }, [transactions, goals, budgets, accounts]);

  // Generate dynamic challenges
  const challenges: Challenge[] = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth));
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const weekExpenses = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && isWithinInterval(d, { start: weekStart, end: weekEnd });
    });

    const savingsRate = stats?.income ? Math.round(((stats.income - stats.expenses) / stats.income) * 100) : 0;
    const monthlyExpensesByCategory = monthExpenses.reduce((acc, t) => {
      if (t.category_id) acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const budgetsOnTrack = budgets.filter(b => {
      const spent = monthlyExpensesByCategory[b.category_id] || 0;
      return spent <= Number(b.amount);
    }).length;

    return [
      {
        id: 'no-spend-day',
        title: 'Zero Spend Day',
        description: 'Go an entire day without spending',
        icon: Zap,
        type: 'daily',
        progress: weekExpenses.length === 0 ? 1 : 0,
        target: 1,
        reward: '+25 XP',
        status: weekExpenses.length === 0 ? 'completed' : 'active',
        xp: 25,
      },
      {
        id: 'savings-champion',
        title: 'Savings Champion',
        description: 'Achieve a 20% or higher savings rate this month',
        icon: TrendingUp,
        type: 'monthly',
        progress: Math.min(savingsRate, 20),
        target: 20,
        reward: '+100 XP',
        status: savingsRate >= 20 ? 'completed' : 'active',
        xp: 100,
      },
      {
        id: 'budget-master',
        title: 'Budget Master',
        description: 'Stay within all budgets for the month',
        icon: Target,
        type: 'monthly',
        progress: budgetsOnTrack,
        target: Math.max(budgets.length, 1),
        reward: '+150 XP',
        status: budgetsOnTrack === budgets.length && budgets.length > 0 ? 'completed' : budgets.length > 0 ? 'active' : 'locked',
        xp: 150,
      },
      {
        id: 'streak-7',
        title: 'Week Warrior',
        description: 'Log transactions for 7 consecutive days',
        icon: Flame,
        type: 'weekly',
        progress: Math.min(currentStreak, 7),
        target: 7,
        reward: '+75 XP',
        status: currentStreak >= 7 ? 'completed' : 'active',
        xp: 75,
      },
      {
        id: 'goal-contributor',
        title: 'Goal Getter',
        description: 'Have at least 3 active savings goals',
        icon: Star,
        type: 'milestone',
        progress: Math.min(goals.length, 3),
        target: 3,
        reward: '+200 XP',
        status: goals.length >= 3 ? 'completed' : goals.length > 0 ? 'active' : 'locked',
        xp: 200,
      },
      {
        id: 'diversify',
        title: 'Portfolio Diversifier',
        description: 'Have 3+ different account types',
        icon: Gift,
        type: 'milestone',
        progress: new Set(accounts.map(a => a.type)).size,
        target: 3,
        reward: '+250 XP',
        status: new Set(accounts.map(a => a.type)).size >= 3 ? 'completed' : 'active',
        xp: 250,
      },
    ];
  }, [transactions, stats, goals, budgets, accounts, currentStreak]);

  // Generate achievement badges
  const badges: AchievementBadge[] = useMemo(() => [
    { id: 'first-tx', name: 'First Step', icon: Star, description: 'Record your first transaction', earned: transactions.length > 0, tier: 'bronze' },
    { id: 'tx-50', name: 'Tracker Pro', icon: TrendingUp, description: 'Log 50 transactions', earned: transactions.length >= 50, tier: 'silver' },
    { id: 'tx-200', name: 'Finance Master', icon: Trophy, description: 'Log 200 transactions', earned: transactions.length >= 200, tier: 'gold' },
    { id: 'streak-30', name: 'Unstoppable', icon: Flame, description: '30-day logging streak', earned: longestStreak >= 30, tier: 'platinum' },
    { id: 'first-goal', name: 'Dreamer', icon: Target, description: 'Create your first goal', earned: goals.length > 0, tier: 'bronze' },
    { id: 'first-budget', name: 'Planner', icon: Zap, description: 'Set your first budget', earned: budgets.length > 0, tier: 'bronze' },
    { id: 'saver-20', name: 'Super Saver', icon: Gift, description: '20%+ savings rate', earned: (stats?.income ?? 0) > 0 && ((((stats?.income ?? 0) - (stats?.expenses ?? 0)) / (stats?.income ?? 1)) * 100) >= 20, tier: 'gold' },
    { id: 'multi-account', name: 'Diversified', icon: Sparkles, description: '3+ account types', earned: new Set(accounts.map(a => a.type)).size >= 3, tier: 'silver' },
  ], [transactions, goals, budgets, stats, accounts, longestStreak]);

  const earnedBadges = badges.filter(b => b.earned).length;
  const completedChallenges = challenges.filter(c => c.status === 'completed').length;

  // Level calculation
  const level = Math.floor(totalXP / 500) + 1;
  const xpToNext = 500 - (totalXP % 500);
  const levelProgress = ((totalXP % 500) / 500) * 100;

  return (
    <div className="space-y-5">
      {/* Level & XP Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card glow-effect"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-2xl font-black text-primary-foreground">{level}</span>
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-warning flex items-center justify-center">
                <Star className="h-3 w-3 text-warning-foreground" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg">Level {level}</h3>
              <p className="text-xs text-muted-foreground">{totalXP} XP total • {xpToNext} XP to next level</p>
              <div className="mt-1.5 w-40">
                <Progress value={levelProgress} className="h-2" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 text-center">
            <div>
              <div className="flex items-center gap-1 justify-center">
                <Flame className="h-4 w-4 text-warning" />
                <span className="text-xl font-bold">{currentStreak}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Day Streak</p>
            </div>
            <div>
              <div className="flex items-center gap-1 justify-center">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold">{earnedBadges}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Badges</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Nav */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        {(['challenges', 'badges', 'streaks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize',
              activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'challenges' && (
          <motion.div key="challenges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            {challenges.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'stat-card !p-4',
                  challenge.status === 'completed' && 'border-income/30 bg-income/5',
                  challenge.status === 'locked' && 'opacity-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                    challenge.status === 'completed' ? 'bg-income/10' : challenge.status === 'locked' ? 'bg-muted' : 'bg-primary/10'
                  )}>
                    {challenge.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-income" />
                    ) : challenge.status === 'locked' ? (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <challenge.icon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{challenge.title}</h4>
                      <Badge variant="outline" className="text-[9px] capitalize">{challenge.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{challenge.progress}/{challenge.target}</span>
                        <span className="text-[10px] font-medium text-primary">{challenge.reward}</span>
                      </div>
                      <Progress value={(challenge.progress / challenge.target) * 100} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'badges' && (
          <motion.div key="badges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'stat-card !p-4 text-center',
                  !badge.earned && 'opacity-40 grayscale'
                )}
              >
                <div className={cn(
                  'h-12 w-12 rounded-2xl mx-auto mb-2 flex items-center justify-center',
                  badge.earned ? tierBg[badge.tier] : 'bg-muted'
                )}>
                  <badge.icon className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-xs">{badge.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
                <Badge className={cn('mt-2 text-[9px] capitalize', tierBg[badge.tier])} variant="secondary">
                  {badge.tier}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'streaks' && (
          <motion.div key="streaks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {/* Streak Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Current', value: currentStreak, icon: Flame, color: 'text-warning' },
                { label: 'Longest', value: longestStreak, icon: Trophy, color: 'text-primary' },
                { label: 'This Week', value: challenges.filter(c => c.status === 'completed').length, icon: Star, color: 'text-income' },
              ].map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card !p-4 text-center">
                  <item.icon className={cn('h-6 w-6 mx-auto mb-1', item.color)} />
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Weekly Activity Heatmap */}
            <div className="stat-card">
              <h3 className="font-semibold text-sm mb-3">Activity (Last 4 Weeks)</h3>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-[9px] text-muted-foreground font-medium pb-1">{day}</div>
                ))}
                {Array.from({ length: 28 }, (_, i) => {
                  const day = format(subDays(new Date(), 27 - i), 'yyyy-MM-dd');
                  const count = transactions.filter(t => t.date === day).length;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'aspect-square rounded-sm transition-colors',
                        count === 0 ? 'bg-muted/50' : count <= 2 ? 'bg-primary/20' : count <= 5 ? 'bg-primary/50' : 'bg-primary'
                      )}
                      title={`${day}: ${count} transactions`}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
