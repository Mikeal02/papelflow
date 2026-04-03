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
      <div
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150',
          isActive
            ? 'text-primary bg-primary/6'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full bg-primary"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && (
          <Badge
            variant="secondary"
            className="h-[18px] px-1.5 text-[9px] font-semibold tracking-wider bg-primary/8 text-primary border-0"
          >
            {item.badge}
          </Badge>
        )}
      </div>
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border/40 bg-sidebar overflow-hidden">
      <div className="flex h-full flex-col relative">
        {/* Logo */}
        <div className="flex h-[60px] items-center gap-3 px-5">
          <div className="h-9 w-9 rounded-xl overflow-hidden">
            <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" loading="eager" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-semibold tracking-tight">Finflow</span>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase -mt-0.5">Pro</p>
          </div>
        </div>

        <div className="mx-4 h-px bg-border/40" />

        {/* Quick Actions */}
        <div className="px-3 pt-3 pb-1 space-y-1.5">
          <Button onClick={onAddTransaction} className="w-full gap-2 h-9 text-[13px] font-medium rounded-lg">
            <Plus className="h-3.5 w-3.5" />
            New Transaction
          </Button>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Command className="h-3 w-3" />
            <span>Quick Search</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-[18px] select-none items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1 font-mono text-[9px] font-medium text-muted-foreground/60">⌘K</kbd>
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 sidebar-scrollbar space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-[0.1em]">
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
        <div className="border-t border-border/40 p-3 space-y-1">
          {/* Theme Toggle */}
          <button
            onClick={() => toggleTheme()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Moon className="h-[15px] w-[15px]" /> : <Sun className="h-[15px] w-[15px]" />}
            <span>{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
            <div className="ml-auto relative h-5 w-9 rounded-full bg-muted border border-border/50 transition-colors">
              <motion.div
                className="absolute top-[3px] h-[14px] w-[14px] rounded-full bg-foreground/80 shadow-sm"
                animate={{ left: theme === 'dark' ? '16px' : '3px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>

          {/* User Card */}
          {user && (
            <div className="mx-1 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                  <span className="text-[11px] font-semibold text-primary-foreground">{userInitial}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{user.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 pt-0.5">
            <Link to="/settings" className="flex-1">
              <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                <Settings className="h-[15px] w-[15px]" />
                Settings
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-destructive/8 hover:text-destructive transition-colors"
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
