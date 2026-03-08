import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
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
  Search,
  Tag,
  CreditCard,
  Trophy,
  Brain,
  Repeat,
  Sparkles,
  Briefcase,
  Moon,
  Sun,
  Zap,
} from 'lucide-react';
import { useTheme } from 'next-themes';

const pages = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', keywords: 'home overview' },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions', keywords: 'payments spending' },
  { icon: Wallet, label: 'Accounts', path: '/accounts', keywords: 'bank credit wallet' },
  { icon: PieChart, label: 'Budgets', path: '/budgets', keywords: 'limits spending' },
  { icon: Tag, label: 'Categories', path: '/categories', keywords: 'tags groups' },
  { icon: Brain, label: 'Analytics', path: '/analytics', keywords: 'data insights intelligence' },
  { icon: BarChart3, label: 'Reports', path: '/reports', keywords: 'charts graphs export' },
  { icon: CalendarClock, label: 'Subscriptions', path: '/subscriptions', keywords: 'recurring bills' },
  { icon: Target, label: 'Goals', path: '/goals', keywords: 'savings targets' },
  { icon: TrendingUp, label: 'Net Worth', path: '/net-worth', keywords: 'assets liabilities' },
  { icon: CreditCard, label: 'Debt Tracker', path: '/debt', keywords: 'loans credit' },
  { icon: Repeat, label: 'Recurring', path: '/recurring', keywords: 'auto payments' },
  { icon: Sparkles, label: 'Tax Estimator', path: '/tax', keywords: 'taxes deductions' },
  { icon: Briefcase, label: 'Investments', path: '/investments', keywords: 'portfolio stocks' },
  { icon: Trophy, label: 'Challenges', path: '/challenges', keywords: 'gamification achievements' },
  { icon: Settings, label: 'Settings', path: '/settings', keywords: 'preferences profile' },
];

interface CommandPaletteProps {
  onAddTransaction?: () => void;
}

export function CommandPalette({ onAddTransaction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => onAddTransaction?.())}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Add Transaction</span>
            <span className="ml-auto text-xs text-muted-foreground">Quick add</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {pages.map((page) => (
            <CommandItem
              key={page.path}
              value={`${page.label} ${page.keywords}`}
              onSelect={() => runCommand(() => navigate(page.path))}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
