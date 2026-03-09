import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PieChart,
  BarChart3,
  CalendarClock,
  Target,
  TrendingUp,
  Settings,
  Plus,
  LogOut,
  ChevronRight,
  Tag,
  CreditCard,
  Sparkles,
  Repeat,
  Briefcase,
  Sun,
  Moon,
  Trophy,
  Brain,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useMemo, useState } from 'react';
import { differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useThemeTransition } from '@/hooks/useThemeTransition';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', badge: null },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions', badge: null },
  { icon: Wallet, label: 'Accounts', path: '/accounts', badge: null },
  { icon: PieChart, label: 'Budgets', path: '/budgets', badge: null },
  { icon: Tag, label: 'Categories', path: '/categories', badge: null },
  { icon: Brain, label: 'Analytics', path: '/analytics', badge: 'NEW' },
  { icon: BarChart3, label: 'Reports', path: '/reports', badge: null },
  { icon: CalendarClock, label: 'Subscriptions', path: '/subscriptions', badge: null },
  { icon: Target, label: 'Goals', path: '/goals', badge: null },
  { icon: TrendingUp, label: 'Net Worth', path: '/net-worth', badge: null },
  { icon: CreditCard, label: 'Debt Tracker', path: '/debt', badge: null },
  { icon: Repeat, label: 'Recurring', path: '/recurring', badge: null },
  { icon: Sparkles, label: 'Tax Estimator', path: '/tax', badge: null },
  { icon: Briefcase, label: 'Investments', path: '/investments', badge: null },
  { icon: Trophy, label: 'Challenges', path: '/challenges', badge: null },
];

interface SidebarProps {
  onAddTransaction: () => void;
}

export function Sidebar({ onAddTransaction }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useThemeTransition();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: budgets = [] } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const alerts = useMemo(() => {
    const now = new Date();
    const overdueSubs = subscriptions.filter(s => s.is_active && differenceInDays(new Date(s.next_due), now) < 0).length;
    
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd)
      .reduce((acc, t) => {
        if (t.category_id) acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const overBudget = budgets.filter(b => {
      const spent = monthExpenses[b.category_id] || 0;
      return spent > Number(b.amount);
    }).length;

    return { overdueSubs, overBudget };
  }, [subscriptions, budgets, transactions]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const enrichedNavItems = navItems.map(item => {
    if (item.path === '/subscriptions' && alerts.overdueSubs > 0) {
      return { ...item, badge: alerts.overdueSubs };
    }
    if (item.path === '/budgets' && alerts.overBudget > 0) {
      return { ...item, badge: alerts.overBudget };
    }
    return item;
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border/50 bg-sidebar/80 backdrop-blur-xl">
      {/* Ambient glow behind sidebar */}
      <div className="absolute -right-20 top-1/3 w-40 h-40 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -right-10 bottom-1/4 w-32 h-32 bg-accent/5 rounded-full blur-[60px] pointer-events-none" />
      
      <div className="flex h-full flex-col relative">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <motion.div 
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="h-11 w-11 rounded-lg overflow-hidden shadow-md shadow-primary/25"
          >
            <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" />
          </motion.div>
          <div className="min-w-0">
            <span className="text-xl font-bold tracking-tight">Finflow</span>
            <p className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase -mt-0.5">Finance Platform</p>
          </div>
        </div>

        {/* Quick Add Button */}
        <div className="p-4 space-y-2">
          <Button
            onClick={onAddTransaction}
            className="w-full gap-2 h-10 btn-premium group"
          >
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
              Add Transaction
            </motion.div>
          </Button>
          
          {/* Command Palette Hint */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              document.dispatchEvent(event);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-all"
          >
            <Command className="h-3 w-3" />
            <span>Search & Navigate</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 sidebar-scrollbar">
          {enrichedNavItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const isHovered = hoveredPath === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  onHoverStart={() => setHoveredPath(item.path)}
                  onHoverEnd={() => setHoveredPath(null)}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary'
                      : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
                  )}
                >
                  {/* Active background with glow */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      style={{
                        boxShadow: '0 0 20px -5px hsl(var(--primary) / 0.15)',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  
                  {/* Hover background */}
                  {isHovered && !isActive && (
                    <motion.div
                      layoutId="sidebar-hover-bg"
                      className="absolute inset-0 rounded-lg bg-sidebar-accent/60"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}

                  {/* Active indicator pill */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                      style={{
                        boxShadow: '2px 0 8px hsl(var(--primary) / 0.4)',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  
                  <motion.div
                    className="relative z-10"
                    animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <item.icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive && 'text-primary')} />
                  </motion.div>
                  <span className="relative z-10 flex-1 truncate">{item.label}</span>
                  {item.badge !== null && (
                    <Badge 
                      variant={typeof item.badge === 'string' ? 'secondary' : 'destructive'} 
                      className={cn(
                        'relative z-10 h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5',
                        typeof item.badge === 'string' && 'bg-primary/10 text-primary border-primary/20 animate-pulse-subtle'
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && !item.badge && (
                    <ChevronRight className="relative z-10 h-3.5 w-3.5 text-primary/60 shrink-0" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User & Actions */}
        <div className="border-t border-sidebar-border/50 p-3 space-y-0.5">
          {/* Dark Mode Toggle */}
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => toggleTheme(e)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
          >
            <div className="relative h-4 w-4">
              <motion.div
                animate={{ rotate: theme === 'dark' ? 0 : 180, opacity: theme === 'dark' ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <Moon className="h-4 w-4" />
              </motion.div>
              <motion.div
                animate={{ rotate: theme === 'dark' ? -180 : 0, opacity: theme === 'dark' ? 0 : 1 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <Sun className="h-4 w-4" />
              </motion.div>
            </div>
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            <div className="ml-auto relative h-5 w-9 rounded-full bg-muted border border-border/50 transition-colors">
              <motion.div
                className="absolute top-0.5 h-4 w-4 rounded-full bg-primary shadow-sm"
                animate={{ left: theme === 'dark' ? '18px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  boxShadow: theme === 'dark' ? '0 0 6px hsl(var(--primary) / 0.5)' : 'none',
                }}
              />
            </div>
          </motion.button>

          {user && (
            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="px-3 py-2.5 mb-2 rounded-lg bg-sidebar-accent/30 backdrop-blur-sm border border-border/10"
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/10">
                  <span className="text-xs font-bold text-primary">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-income animate-pulse" title="Online" />
              </div>
            </motion.div>
          )}
          <Link to="/settings">
            <motion.div
              whileHover={{ x: 2 }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              Settings
            </motion.div>
          </Link>
          <motion.button
            whileHover={{ x: 2 }}
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
