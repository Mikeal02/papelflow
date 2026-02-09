import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  Download,
  MoreHorizontal,
  Repeat,
  Loader2,
  Filter,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ReceiptScanner } from '@/components/transactions/ReceiptScanner';
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { exportTransactionsToCSV } from '@/lib/export-utils';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const Transactions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const deleteTransaction = useDeleteTransaction();
  const { formatCurrency } = useCurrency();

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.payee?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesAccount =
      accountFilter === 'all' || transaction.account_id === accountFilter;

    return (searchQuery === '' || matchesSearch) && matchesType && matchesAccount;
  });

  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: 'No transactions to export',
        description: 'Add some transactions first',
        variant: 'destructive',
      });
      return;
    }
    exportTransactionsToCSV(filteredTransactions, formatCurrency);
    toast({
      title: 'Export successful!',
      description: `Exported ${filteredTransactions.length} transactions to CSV`,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading transactions...</p>
        </div>
      </AppLayout>
    );
  }

  const FilterContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold">Type</label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full bg-muted/30">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfers</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">Account</label>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-full bg-muted/30">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredTransactions.length} transactions found
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <ReceiptScanner />
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={handleExport}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex gap-2 md:gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/30 border-border/50"
            />
          </div>
          
          <div className="hidden md:flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] bg-muted/30 border-border/50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[150px] bg-muted/30 border-border/50">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden shrink-0 border-border/50">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4 pb-4">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </motion.div>

        {/* Transactions List */}
        <AnimatePresence mode="popLayout">
          {filteredTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="stat-card flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                  <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">No transactions yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add your first transaction to start tracking your finances
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-5"
            >
              {sortedDates.map((date, dateIndex) => (
                <motion.div 
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + dateIndex * 0.05 }}
                >
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 sticky top-16 md:top-0 bg-background/90 backdrop-blur-sm py-2 z-10 border-b border-border/30">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="space-y-2">
                    {groupedTransactions[date].map((transaction, index) => {
                      const Icon =
                        transaction.type === 'income'
                          ? ArrowUpRight
                          : transaction.type === 'transfer'
                          ? ArrowLeftRight
                          : ArrowDownLeft;

                      return (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: dateIndex * 0.02 + index * 0.02 }}
                          whileHover={{ scale: 1.005 }}
                          className="flex items-center gap-3 md:gap-4 rounded-xl bg-card/50 p-3.5 md:p-4 border border-border/30 hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-default"
                        >
                          <div
                            className={cn(
                              'flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110',
                              transaction.type === 'income' && 'bg-gradient-to-br from-income/20 to-income/10',
                              transaction.type === 'expense' && 'bg-gradient-to-br from-expense/20 to-expense/10',
                              transaction.type === 'transfer' && 'bg-gradient-to-br from-transfer/20 to-transfer/10'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-5 w-5 md:h-6 md:w-6',
                                transaction.type === 'income' && 'text-income',
                                transaction.type === 'expense' && 'text-expense',
                                transaction.type === 'transfer' && 'text-transfer'
                              )}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm md:text-base truncate">
                                {transaction.payee ||
                                  (transaction.type === 'transfer'
                                    ? `Transfer`
                                    : (transaction.category as any)?.name || 'Uncategorized')}
                              </p>
                              {transaction.is_recurring && (
                                <Repeat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {(transaction.account as any)?.name}
                              {(transaction.category as any)?.name && (
                                <> • {(transaction.category as any).name}</>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-base md:text-lg font-bold tabular-nums',
                                transaction.type === 'income' && 'amount-positive',
                                transaction.type === 'expense' && 'amount-negative',
                                transaction.type === 'transfer' && 'amount-neutral'
                              )}
                            >
                              {formatCurrency(
                                Number(transaction.amount),
                                transaction.type === 'income' || transaction.type === 'expense'
                              )}
                            </span>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => deleteTransaction.mutate(transaction.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Transactions;
