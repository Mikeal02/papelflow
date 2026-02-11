import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Building2,
  CreditCard,
  PiggyBank,
  Banknote,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  Search,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

const accountIcons: Record<string, typeof Wallet> = {
  bank: Building2, cash: Banknote, credit_card: CreditCard,
  wallet: Wallet, loan: CreditCard, investment: PiggyBank,
};

const accountTypeLabels: Record<string, string> = {
  bank: 'Bank Account', cash: 'Cash', credit_card: 'Credit Card',
  wallet: 'Digital Wallet', loan: 'Loan', investment: 'Investment',
};

const accountColors = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'
];

const COLORS = [
  'hsl(215, 85%, 55%)', 'hsl(155, 70%, 45%)', 'hsl(170, 75%, 45%)',
  'hsl(40, 95%, 50%)', 'hsl(0, 78%, 58%)', 'hsl(280, 70%, 55%)',
];

const Accounts = () => {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
  const { formatCurrency } = useCurrency();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newAccount, setNewAccount] = useState({
    name: '', type: 'bank' as const, balance: '', color: accountColors[0],
  });

  const filteredAccounts = useMemo(() =>
    accounts.filter(a => searchQuery === '' || a.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [accounts, searchQuery]
  );

  const assets = filteredAccounts.filter(a => a.type !== 'credit_card' && a.type !== 'loan');
  const liabilities = filteredAccounts.filter(a => a.type === 'credit_card' || a.type === 'loan');
  const totalAssets = assets.reduce((sum, a) => sum + Math.max(0, Number(a.balance)), 0);
  const totalLiabilities = Math.abs(liabilities.reduce((sum, a) => sum + Number(a.balance), 0));
  const netWorth = totalAssets - totalLiabilities;

  // Account type distribution
  const typeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach(a => {
      const label = accountTypeLabels[a.type] || a.type;
      map[label] = (map[label] || 0) + Math.abs(Number(a.balance || 0));
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).filter(v => v.value > 0);
  }, [accounts]);

  // Activity per account (transaction count this month)
  const accountActivity = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const map: Record<string, number> = {};
    transactions.filter(t => t.date.startsWith(currentMonth)).forEach(t => {
      map[t.account_id] = (map[t.account_id] || 0) + 1;
    });
    return map;
  }, [transactions]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAccount.mutateAsync({
      name: newAccount.name,
      type: newAccount.type,
      balance: parseFloat(newAccount.balance) || 0,
      opening_balance: parseFloat(newAccount.balance) || 0,
      color: newAccount.color,
    });
    setIsCreateOpen(false);
    setNewAccount({ name: '', type: 'bank', balance: '', color: accountColors[0] });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading accounts...</p>
        </div>
      </AppLayout>
    );
  }

  const renderAccountCard = (account: typeof accounts[0], index: number, section: 'asset' | 'liability') => {
    const Icon = accountIcons[account.type] || Wallet;
    const activity = accountActivity[account.id] || 0;

    return (
      <motion.div
        key={account.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 + index * 0.05 }}
        whileHover={{ scale: 1.02, y: -2 }}
        className={cn('stat-card group', section === 'liability' && 'border-expense/20')}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110 shrink-0"
            style={{ backgroundColor: `${account.color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color: account.color || undefined }} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>View transactions</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteAccount.mutate(account.id)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-sm sm:text-base truncate" title={account.name}>{account.name}</h3>
        <div className="flex items-center gap-2 mt-0.5 mb-3">
          <Badge variant="outline" className="text-[9px] capitalize">{account.type.replace('_', ' ')}</Badge>
          {activity > 0 && <span className="text-[10px] text-muted-foreground">{activity} txns this mo</span>}
        </div>

        <div className="flex items-end justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground">Balance</p>
            <p className={cn('text-lg sm:text-xl font-bold truncate', section === 'liability' ? 'text-expense' : '')} title={formatCurrency(Math.abs(Number(account.balance)))}>
              {section === 'liability' ? '-' : ''}{formatCurrency(Math.abs(Number(account.balance)))}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Accounts</h1>
            <p className="text-sm text-muted-foreground mt-1">{accounts.length} accounts • Net worth: <span className={cn('font-semibold', netWorth >= 0 ? 'text-income' : 'text-expense')}>{formatCurrency(netWorth)}</span></p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 btn-premium">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Account</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </motion.div>

        {/* Summary + Distribution */}
        <div className="grid gap-4 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-income/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-income" />
              </div>
              <span className="text-xs text-muted-foreground">Assets</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-income truncate">{formatCurrency(totalAssets)}</p>
            <p className="text-[10px] text-muted-foreground">{assets.length} accounts</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="stat-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-expense/10 shrink-0">
                <TrendingDown className="h-4 w-4 text-expense" />
              </div>
              <span className="text-xs text-muted-foreground">Liabilities</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-expense truncate">-{formatCurrency(totalLiabilities)}</p>
            <p className="text-[10px] text-muted-foreground">{liabilities.length} accounts</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="stat-card p-4 glow-effect">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Net Worth</span>
            </div>
            <p className={cn('text-lg md:text-xl font-bold truncate', netWorth >= 0 ? 'text-income' : 'text-expense')}>{formatCurrency(netWorth)}</p>
            <p className="text-[10px] text-muted-foreground">{accounts.length} total accounts</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="stat-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 shrink-0">
                <BarChart3 className="h-4 w-4 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground">Distribution</span>
            </div>
            {typeDistribution.length > 0 ? (
              <div className="h-[60px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={15} outerRadius={28} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data</p>
            )}
          </motion.div>
        </div>

        {/* Search */}
        {accounts.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-border/50"
              />
            </div>
          </motion.div>
        )}

        {/* Accounts Grid */}
        {filteredAccounts.length === 0 && accounts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-6 text-sm">Add your first account to start tracking</p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 btn-premium">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </motion.div>
        ) : (
          <>
            {assets.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base md:text-lg font-bold">Assets</h2>
                  <Badge variant="secondary" className="text-[10px]">{assets.length}</Badge>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {assets.map((a, i) => renderAccountCard(a, i, 'asset'))}
                </div>
              </div>
            )}
            {liabilities.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base md:text-lg font-bold">Liabilities</h2>
                  <Badge variant="secondary" className="text-[10px]">{liabilities.length}</Badge>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {liabilities.map((a, i) => renderAccountCard(a, i, 'liability'))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Account Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="gradient-text">Add New Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input placeholder="e.g., Main Checking" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} className="bg-muted/30" required />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={newAccount.type} onValueChange={(value: any) => setNewAccount({ ...newAccount, type: value })}>
                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="wallet">Digital Wallet</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Balance</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={newAccount.balance} onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {accountColors.map(color => (
                  <button key={color} type="button" onClick={() => setNewAccount({ ...newAccount, color })} className={cn('h-7 w-7 rounded-full transition-transform', newAccount.color === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110')} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1 btn-premium" disabled={createAccount.isPending}>
                {createAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Accounts;
