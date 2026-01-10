import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  Download,
  MoreHorizontal,
  Tag,
  Repeat,
  Loader2,
  Filter,
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

  // Group transactions by date
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Mobile filter sheet content
  const FilterContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full bg-card/50">
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
        <label className="text-sm font-medium">Account</label>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-full bg-card/50">
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
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredTransactions.length} transactions found
            </p>
          </div>
          <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 md:gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50"
            />
          </div>
          
          {/* Desktop filters */}
          <div className="hidden md:flex gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] bg-card/50">
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
              <SelectTrigger className="w-[160px] bg-card/50">
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

          {/* Mobile filter button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </motion.div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card flex flex-col items-center justify-center py-12 md:py-16 text-center"
          >
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <ArrowLeftRight className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2">No transactions yet</h3>
            <p className="text-sm text-muted-foreground">Add your first transaction to start tracking</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 md:space-y-6"
          >
            {sortedDates.map((date, dateIndex) => (
              <div key={date}>
                <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-2 md:mb-3 sticky top-16 md:top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                  {format(new Date(date), 'EEE, MMM d, yyyy')}
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + dateIndex * 0.05 + index * 0.02 }}
                        className="flex items-center gap-3 md:gap-4 rounded-xl md:rounded-2xl bg-card/50 p-3 md:p-4 border border-border/30 hover:border-primary/30 transition-all duration-300 group"
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg md:rounded-xl transition-transform group-hover:scale-110',
                            transaction.type === 'income' && 'bg-income/10',
                            transaction.type === 'expense' && 'bg-expense/10',
                            transaction.type === 'transfer' && 'bg-transfer/10'
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
                              <Repeat className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {(transaction.account as any)?.name}
                            {(transaction.category as any)?.name && (
                              <> • {(transaction.category as any).name}</>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm md:text-lg font-bold tabular-nums',
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
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>Duplicate</DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
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
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Transactions;
