import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, BarChart3,
  CalendarClock, Target, TrendingUp, Settings, Plus, LogOut,
  Menu, ChevronRight, Tag, CreditCard, Trophy, Brain, Repeat,
  Sparkles, Briefcase, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/sounds';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const bottomTabs = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: ArrowLeftRight, label: 'Txns', path: '/transactions' },
  { icon: PieChart, label: 'Budget', path: '/budgets' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
];

const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Brain, label: 'Analytics', path: '/analytics' },
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between h-full px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg overflow-hidden ring-1 ring-primary/10 shadow-sm">
              <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight">Finflow</span>
              <span className="ml-1.5 text-[8px] font-bold text-primary tracking-widest uppercase">PRO</span>
            </div>
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-background/98 backdrop-blur-2xl border-border/20 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2.5 h-14 px-5 border-b border-border/20">
                  <div className="h-8 w-8 rounded-lg overflow-hidden">
                    <img src="/logo.png" alt="Finflow" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-base font-bold tracking-tight">Finflow</span>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                  {navGroups.map((group) => (
                    <div key={group.label}>
                      <p className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em]">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <button
                              key={item.path}
                              onClick={() => handleNavClick(item.path)}
                              className={cn(
                                'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.97]',
                                isActive
                                  ? 'bg-primary/8 text-primary'
                                  : 'text-foreground/60 hover:bg-muted active:bg-muted/80'
                              )}
                            >
                              {isActive && (
                                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                              )}
                              <item.icon className={cn('h-[15px] w-[15px]', isActive ? 'text-primary' : 'text-muted-foreground')} />
                              <span className="flex-1 text-left">{item.label}</span>
                              {isActive && <ChevronRight className="h-3 w-3 text-primary/50" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="border-t border-border/20 p-3 space-y-1">
                  {user && (
                    <div className="mx-1 px-3 py-2.5 mb-1 rounded-xl bg-muted/30 border border-border/10">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary-foreground">{user.email?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold truncate">{user.email?.split('@')[0]}</p>
                          <p className="text-[10px] text-muted-foreground/60 truncate">{user.email}</p>
                        </div>
                        <Shield className="h-3 w-3 text-income/70 shrink-0" />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleNavClick('/settings')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-muted transition-all"
                  >
                    <Settings className="h-[15px] w-[15px]" />
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <LogOut className="h-[15px] w-[15px]" />
                    Sign Out
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-background/85 backdrop-blur-2xl border-t border-border/20" />
        
        <div className="relative flex items-center justify-around px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {bottomTabs.slice(0, 2).map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200 active:scale-90',
                  isActive ? 'text-primary' : 'text-muted-foreground/60'
                )}
              >
                <div className="relative">
                  <tab.icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]')} />
                </div>
                <span className={cn('text-[10px] font-semibold', isActive && 'text-primary')}>{tab.label}</span>
              </Link>
            );
          })}

          {/* Center FAB — no infinite animation */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => { haptic('medium'); onAddTransaction(); }}
            className="relative -mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl"
            style={{
              boxShadow: '0 8px 24px -4px hsl(var(--primary) / 0.45), 0 2px 8px -2px hsl(var(--primary) / 0.25)',
            }}
          >
            <Plus className="h-6 w-6" />
          </motion.button>

          {bottomTabs.slice(2, 4).map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200 active:scale-90',
                  isActive ? 'text-primary' : 'text-muted-foreground/60'
                )}
              >
                <div className="relative">
                  <tab.icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]')} />
                </div>
                <span className={cn('text-[10px] font-semibold', isActive && 'text-primary')}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
