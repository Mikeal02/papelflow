import { useState } from 'react';
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
  Menu,
  ChevronRight,
  Tag,
  CreditCard,
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
  { icon: Tag, label: 'Categories', path: '/categories' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: CalendarClock, label: 'Subscriptions', path: '/subscriptions' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: TrendingUp, label: 'Net Worth', path: '/net-worth' },
  { icon: CreditCard, label: 'Debt Tracker', path: '/debt' },
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
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Finflow</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onAddTransaction}
            size="sm"
            className="gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Add</span>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-sidebar border-sidebar-border p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
                      <TrendingUp className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">Finflow</span>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={cn(
                          'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                        )}
                        <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="h-3.5 w-3.5 text-primary/60" />
                        )}
                      </button>
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
                  <button
                    onClick={() => handleNavClick('/settings')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
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
