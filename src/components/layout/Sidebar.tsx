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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions' },
  { icon: Wallet, label: 'Accounts', path: '/accounts' },
  { icon: PieChart, label: 'Budgets', path: '/budgets' },
  { icon: Tag, label: 'Categories', path: '/categories' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: CalendarClock, label: 'Subscriptions', path: '/subscriptions' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: TrendingUp, label: 'Net Worth', path: '/net-worth' },
  { icon: CreditCard, label: 'Debt Tracker', path: '/debt' },
];

interface SidebarProps {
  onAddTransaction: () => void;
}

export function Sidebar({ onAddTransaction }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Finflow</span>
        </div>

        {/* Quick Add Button */}
        <div className="p-4">
          <Button
            onClick={onAddTransaction}
            className="w-full gap-2 h-10"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
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
                  <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-primary/60" />
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
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium truncate">{user.email}</p>
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
