import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, BarChart3,
  CalendarClock, Target, TrendingUp, Settings, Plus, LogOut,
  ChevronRight, Tag, CreditCard, Sparkles, Repeat, Briefcase,
  Sun, Moon, Trophy, Brain, Command, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { memo, useMemo } from 'react';
import { useThemeTransition } from '@/hooks/useThemeTransition';
import { Separator } from '@/components/ui/separator';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Brain, label: 'Analytics', path: '/analytics', badge: 'NEW' },
      { icon: BarChart3, label: 'Reports', path: '/reports' },
    ],
  },
  {
    label: 'Money',
    items: [
      { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions' },
      { icon: Wallet, label: 'Accounts', path: '/accounts' },
      { icon: PieChart, label: 'Budgets', path: '/budgets' },
      { icon: Tag, label: 'Categories', path: '/categories' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { icon: Target, label: 'Goals', path: '/goals' },
      { icon: TrendingUp, label: 'Net Worth', path: '/net-worth' },
      { icon: CalendarClock, label: 'Subscriptions', path: '/subscriptions' },
      { icon: Repeat, label: 'Recurring', path: '/recurring' },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { icon: CreditCard, label: 'Debt Tracker', path: '/debt' },
      { icon: Sparkles, label: 'Tax Estimator', path: '/tax' },
      { icon: Briefcase, label: 'Investments', path: '/investments' },
      { icon: Trophy, label: 'Challenges', path: '/challenges' },
    ],
  },
];

interface SidebarProps {
  onAddTransaction: () => void;
}

const NavItem = memo(function NavItem({ item, isActive }: { item: { icon: any; label: string; path: string; badge?: string }; isActive: boolean }) {
  return (
    <Link to={item.path}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className={cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
          isActive
            ? 'text-primary'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-xl bg-primary/8 border border-primary/10"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        {isActive && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
            style={{ boxShadow: '2px 0 8px hsl(var(--primary) / 0.3)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <item.icon className={cn('h-[15px] w-[15px] shrink-0 relative z-10 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')} />
        <span className="relative z-10 flex-1 truncate">{item.label}</span>
        {item.badge && (
          <Badge
            variant="secondary"
            className="relative z-10 h-[18px] px-1.5 text-[9px] font-bold tracking-wider bg-primary/10 text-primary border-primary/15"
          >
            {item.badge}
          </Badge>
        )}
        {isActive && !item.badge && (
          <ChevronRight className="relative z-10 h-3 w-3 text-primary/50 shrink-0" />
        )}
      </motion.div>
    </Link>
  );
});

export const Sidebar = memo(function Sidebar({ onAddTransaction }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useThemeTransition();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitial = useMemo(() => {
    return user?.email?.charAt(0).toUpperCase() || '?';
  }, [user?.email]);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border/20 bg-sidebar/80 backdrop-blur-2xl overflow-hidden">
      <div className="flex h-full flex-col relative">
        {/* Logo */}
        <div className="flex h-[60px] items-center gap-3 px-5">
          <div
            className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-primary/10"
            style={{ boxShadow: '0 4px 16px -4px hsl(var(--primary) / 0.3)' }}
          >
            <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" loading="eager" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-bold tracking-tight">Finflow</span>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-income" />
              <p className="text-[9px] text-muted-foreground font-semibold tracking-widest uppercase">Pro</p>
            </div>
          </div>
        </div>

        <Separator className="mx-4 w-auto opacity-30" />

        {/* Quick Actions */}
        <div className="px-3 pt-3 pb-1 space-y-1.5">
          <Button onClick={onAddTransaction} className="w-full gap-2 h-9 text-[13px] btn-premium group rounded-xl">
            <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90 duration-300" />
            New Transaction
          </Button>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground/70 hover:text-muted-foreground hover:bg-sidebar-accent/40 transition-all"
          >
            <Command className="h-3 w-3" />
            <span>Quick Search</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-[18px] select-none items-center gap-0.5 rounded border border-border/30 bg-muted/30 px-1 font-mono text-[9px] font-medium text-muted-foreground/60">⌘K</kbd>
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 sidebar-scrollbar space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.path} item={item} isActive={location.pathname === item.path} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border/20 p-3 space-y-1">
          {/* Theme Toggle */}
          <button
            onClick={() => toggleTheme()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
          >
            {theme === 'dark' ? <Moon className="h-[15px] w-[15px]" /> : <Sun className="h-[15px] w-[15px]" />}
            <span>{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
            <div className="ml-auto relative h-[18px] w-8 rounded-full bg-muted/50 border border-border/30 transition-colors">
              <motion.div
                className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-primary shadow-sm"
                animate={{ left: theme === 'dark' ? '14px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>

          {/* User Card */}
          {user && (
            <div className="mx-1 px-3 py-2.5 rounded-xl bg-gradient-to-br from-sidebar-accent/40 to-sidebar-accent/20 border border-border/10">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                  <span className="text-[11px] font-bold text-primary-foreground">{userInitial}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">{user.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-muted-foreground/60 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-income/70" />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 pt-0.5">
            <Link to="/settings" className="flex-1">
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200">
                <Settings className="h-[15px] w-[15px]" />
                Settings
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              title="Sign Out"
            >
              <LogOut className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
});
