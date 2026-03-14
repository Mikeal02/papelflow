import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, BarChart3,
  CalendarClock, Target, TrendingUp, Settings, Plus, LogOut,
  ChevronRight, Tag, CreditCard, Sparkles, Repeat, Briefcase,
  Sun, Moon, Trophy, Brain, Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { memo, useMemo, useState } from 'react';
import { useThemeTransition } from '@/hooks/useThemeTransition';

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

// Memoized nav item to prevent re-renders on hover of siblings
const NavItem = memo(function NavItem({ item, isActive }: { item: typeof navItems[0]; isActive: boolean }) {
  return (
    <Link to={item.path}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className={cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
          isActive
            ? 'text-primary'
            : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60'
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-lg bg-primary/10"
            style={{ boxShadow: '0 0 20px -5px hsl(var(--primary) / 0.15)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        {isActive && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
            style={{ boxShadow: '2px 0 8px hsl(var(--primary) / 0.4)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <item.icon className={cn('h-4 w-4 shrink-0 relative z-10 transition-colors', isActive && 'text-primary')} />
        <span className="relative z-10 flex-1 truncate">{item.label}</span>
        {item.badge !== null && (
          <Badge
            variant={typeof item.badge === 'string' ? 'secondary' : 'destructive'}
            className={cn(
              'relative z-10 h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5',
              typeof item.badge === 'string' && 'bg-primary/10 text-primary border-primary/20'
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

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border/30 bg-sidebar/70 backdrop-blur-2xl overflow-hidden">
      {/* Static ambient depth — no JS animation loops */}
      <div className="absolute -right-24 top-1/4 w-48 h-48 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -right-16 bottom-1/3 w-36 h-36 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex h-full flex-col relative">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/50 px-6">
          <div className="h-11 w-11 rounded-lg overflow-hidden" style={{ boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.4)' }}>
            <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" loading="eager" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-bold tracking-tight">Finflow</span>
            <p className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase -mt-0.5">Finance Platform</p>
          </div>
        </div>

        {/* Quick Add */}
        <div className="p-4 space-y-2">
          <Button onClick={onAddTransaction} className="w-full gap-2 h-10 btn-premium group">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
            Add Transaction
          </Button>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-all"
          >
            <Command className="h-3 w-3" />
            <span>Search & Navigate</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </button>
        </div>

        {/* Navigation — no data-fetching, no hover state tracking */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 sidebar-scrollbar">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} isActive={location.pathname === item.path} />
          ))}
        </nav>

        {/* User & Actions */}
        <div className="border-t border-sidebar-border/50 p-3 space-y-0.5">
          <button
            onClick={() => toggleTheme()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            <div className="ml-auto relative h-5 w-9 rounded-full bg-muted border border-border/50 transition-colors">
              <motion.div
                className="absolute top-0.5 h-4 w-4 rounded-full bg-primary shadow-sm"
                animate={{ left: theme === 'dark' ? '18px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>

          {user && (
            <div className="px-3 py-2.5 mb-2 rounded-lg bg-sidebar-accent/30 backdrop-blur-sm border border-border/10">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/10">
                  <span className="text-xs font-bold text-primary">{user.email?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-income" title="Online" />
              </div>
            </div>
          )}
          <Link to="/settings">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200">
              <Settings className="h-4 w-4" />
              Settings
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
});
