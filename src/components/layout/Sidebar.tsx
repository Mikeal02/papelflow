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
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useMemo } from 'react';
import { differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', badge: null },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions', badge: null },
  { icon: Wallet, label: 'Accounts', path: '/accounts', badge: null },
  { icon: PieChart, label: 'Budgets', path: '/budgets', badge: null },
  { icon: Tag, label: 'Categories', path: '/categories', badge: null },
  { icon: BarChart3, label: 'Reports', path: '/reports', badge: null },
  { icon: CalendarClock, label: 'Subscriptions', path: '/subscriptions', badge: null },
  { icon: Target, label: 'Goals', path: '/goals', badge: null },
  { icon: TrendingUp, label: 'Net Worth', path: '/net-worth', badge: null },
  { icon: CreditCard, label: 'Debt Tracker', path: '/debt', badge: null },
];

interface SidebarProps {
  onAddTransaction: () => void;
}

export function Sidebar({ onAddTransaction }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: budgets = [] } = useBudgets();
  const { data: transactions = [] } = useTransactions();

  const alerts = useMemo(() => {
    const now = new Date();
    const overdueSubs = subscriptions.filter(s => s.is_active && differenceInDays(new Date(s.next_due), now) < 0).length;
    
    const currentMonth = now.toISOString().slice(0, 7);
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/20">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-bold tracking-tight">Finflow</span>
            <p className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase -mt-0.5">Finance Platform</p>
          </div>
        </div>

        {/* Quick Add Button */}
        <div className="p-4">
          <Button
            onClick={onAddTransaction}
            className="w-full gap-2 h-10 btn-premium"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {enrichedNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary"
                    />
                  )}
                  <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== null && item.badge > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && !item.badge && (
                    <ChevronRight className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User & Actions */}
        <div className="border-t border-sidebar-border p-3 space-y-0.5">
          {user && (
            <div className="px-3 py-2.5 mb-2 rounded-lg bg-sidebar-accent/50">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
              </div>
            </div>
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
