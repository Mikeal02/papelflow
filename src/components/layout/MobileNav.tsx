import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions' },
  { icon: Wallet, label: 'Accounts', path: '/accounts' },
  { icon: PieChart, label: 'Budgets', path: '/budgets' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: CalendarClock, label: 'Subscriptions', path: '/subscriptions' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: TrendingUp, label: 'Net Worth', path: '/net-worth' },
];

interface MobileNavProps {
  onAddTransaction: () => void;
}

export function MobileNav({ onAddTransaction }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold gradient-text">Finflow</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onAddTransaction}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Add</span>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-sidebar/95 backdrop-blur-xl border-sidebar-border p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                      <TrendingUp className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-lg font-bold gradient-text">Finflow</span>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={cn(
                          'relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300',
                          isActive
                            ? 'bg-gradient-to-r from-primary/20 to-accent/10 text-foreground border border-primary/20'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                        {item.label}
                        {isActive && (
                          <Sparkles className="h-3 w-3 ml-auto text-primary animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* User & Actions */}
                <div className="border-t border-sidebar-border p-3 space-y-1">
                  {user && (
                    <div className="px-3 py-2 mb-2">
                      <p className="text-xs text-muted-foreground">Signed in as</p>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleNavClick('/settings')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
