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
  ChevronRight,
  Tag,
  CreditCard,
  Trophy,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/sounds';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const bottomTabs = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: ArrowLeftRight, label: 'Txns', path: '/transactions' },
  { icon: PieChart, label: 'Budgets', path: '/budgets' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
];

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
  { icon: BarChart3, label: 'Recurring', path: '/recurring' },
  { icon: BarChart3, label: 'Tax Estimator', path: '/tax' },
  { icon: TrendingUp, label: 'Investments', path: '/investments' },
  { icon: Trophy, label: 'Challenges', path: '/challenges' },
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
    haptic('light');
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      {/* Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/90 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between h-full px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl overflow-hidden shadow-sm">
              <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight">Finflow</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background/95 backdrop-blur-2xl border-border/30 p-0">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between h-14 px-5 border-b border-border/30">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl overflow-hidden">
                        <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" />
                      </div>
                      <span className="text-lg font-bold tracking-tight">Finflow</span>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                    {navItems.map((item, i) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <motion.button
                          key={item.path}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.25 }}
                          onClick={() => handleNavClick(item.path)}
                          className={cn(
                            'relative flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.97]',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-muted active:bg-muted/80'
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="mobile-active-indicator"
                              className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <item.icon className={cn('h-[18px] w-[18px]', isActive && 'text-primary')} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {isActive && (
                            <ChevronRight className="h-3.5 w-3.5 text-primary/60" />
                          )}
                        </motion.button>
                      );
                    })}
                  </nav>

                  {/* User & Actions */}
                  <div className="border-t border-border/30 p-4 space-y-1">
                    {user && (
                      <div className="px-3.5 py-3 mb-2 rounded-xl bg-muted/50 backdrop-blur-sm">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Signed in as</p>
                        <p className="text-sm font-medium truncate mt-0.5">{user.email}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleNavClick('/settings')}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-foreground/70 hover:bg-muted active:scale-[0.97] transition-all duration-200"
                    >
                      <Settings className="h-[18px] w-[18px]" />
                      Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-foreground/70 hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] transition-all duration-200"
                    >
                      <LogOut className="h-[18px] w-[18px]" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-t border-border/30" />
        
        <div className="relative flex items-center justify-around px-2 pb-safe pt-1.5 pb-2">
          {bottomTabs.slice(0, 2).map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200 active:scale-90',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <tab.icon className="h-5 w-5" />
                  {isActive && (
                    <motion.div
                      layoutId="bottom-tab-glow"
                      className="absolute -inset-2 rounded-xl bg-primary/15 blur-md"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}

          {/* Center FAB */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onAddTransaction}
            className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl"
            style={{
              boxShadow: '0 8px 30px -4px hsl(var(--primary) / 0.5), 0 2px 8px -2px hsl(var(--primary) / 0.3)',
            }}
          >
            <Plus className="h-6 w-6" />
            <motion.div
              className="absolute inset-0 rounded-2xl bg-primary"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>

          {bottomTabs.slice(2, 4).map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200 active:scale-90',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <tab.icon className="h-5 w-5" />
                  {isActive && (
                    <motion.div
                      layoutId="bottom-tab-glow"
                      className="absolute -inset-2 rounded-xl bg-primary/15 blur-md"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
