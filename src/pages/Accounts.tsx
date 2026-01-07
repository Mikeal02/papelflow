import { useState } from 'react';
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
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

const accountIcons: Record<string, typeof Wallet> = {
  bank: Building2,
  cash: Banknote,
  credit_card: CreditCard,
  wallet: Wallet,
  loan: CreditCard,
  investment: PiggyBank,
};

const accountTypeLabels: Record<string, string> = {
  bank: 'Bank Account',
  cash: 'Cash',
  credit_card: 'Credit Card',
  wallet: 'Digital Wallet',
  loan: 'Loan',
  investment: 'Investment',
};

const accountColors = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'
];

const Accounts = () => {
  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
  const { formatCurrency } = useCurrency();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'bank' as const,
    balance: '',
    color: accountColors[0],
  });

  const assets = accounts.filter(
    (a) => a.type !== 'credit_card' && a.type !== 'loan'
  );

  const liabilities = accounts.filter(
    (a) => a.type === 'credit_card' || a.type === 'loan'
  );

  const totalAssets = assets.reduce((sum, a) => sum + Math.max(0, Number(a.balance)), 0);
  const totalLiabilities = Math.abs(
    liabilities.reduce((sum, a) => sum + Number(a.balance), 0)
  );
  const netWorth = totalAssets - totalLiabilities;

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
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold gradient-text">Accounts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your financial accounts
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-gradient-sunset hover:opacity-90 text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </motion.div>

        {/* Net Worth Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-5 md:grid-cols-3"
        >
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-income/10">
                <TrendingUp className="h-6 w-6 text-income" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold amount-positive">
                  ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-expense/10">
                <TrendingDown className="h-6 w-6 text-expense" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Liabilities</p>
                <p className="text-2xl font-bold amount-negative">
                  -${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card glow-effect">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Worth</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    netWorth >= 0 ? 'amount-positive' : 'amount-negative'
                  )}
                >
                  {netWorth < 0 && '-'}$
                  {Math.abs(netWorth).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-6">Add your first account to start tracking your finances</p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-gradient-sunset hover:opacity-90 text-primary-foreground">
              <Plus className="h-4 w-4" />
              Add Your First Account
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Assets Section */}
            {assets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-xl font-semibold mb-4">Assets</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {assets.map((account, index) => {
                    const Icon = accountIcons[account.type] || Wallet;

                    return (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + index * 0.05 }}
                        className="stat-card group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${account.color}20` }}
                          >
                            <Icon className="h-6 w-6" style={{ color: account.color || undefined }} />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>View transactions</DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteAccount.mutate(account.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h3 className="font-semibold text-lg">{account.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {accountTypeLabels[account.type]}
                        </p>

                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Balance</p>
                            <p className="text-2xl font-bold">
                              ${Number(account.balance).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Liabilities Section */}
            {liabilities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-semibold mb-4">Liabilities</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {liabilities.map((account, index) => {
                    const Icon = accountIcons[account.type];

                    return (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 + index * 0.05 }}
                        className="stat-card group border-expense/20"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${account.color}20` }}
                          >
                            <Icon className="h-6 w-6" style={{ color: account.color || undefined }} />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>View transactions</DropdownMenuItem>
                              <DropdownMenuItem>Make payment</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h3 className="font-semibold text-lg">{account.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {accountTypeLabels[account.type]}
                        </p>

                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Balance Owed</p>
                            <p className="text-2xl font-bold amount-negative">
                              ${Math.abs(Number(account.balance)).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
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
              <Input
                placeholder="e.g., Main Checking"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                className="bg-muted/30"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select 
                value={newAccount.type} 
                onValueChange={(value: any) => setNewAccount({ ...newAccount, type: value })}
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
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
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newAccount.balance}
                onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {accountColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewAccount({ ...newAccount, color })}
                    className={cn(
                      'h-8 w-8 rounded-full transition-transform',
                      newAccount.color === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-sunset hover:opacity-90 text-primary-foreground" disabled={createAccount.isPending}>
                {createAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Accounts;
