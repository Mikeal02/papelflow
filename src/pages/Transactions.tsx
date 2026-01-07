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
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

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
            <h1 className="text-3xl font-bold gradient-text">Transactions</h1>
            <p className="text-muted-foreground mt-1">
              {filteredTransactions.length} transactions found
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50"
            />
          </div>
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
        </motion.div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No transactions yet</h3>
            <p className="text-muted-foreground">Add your first transaction to start tracking</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {sortedDates.map((date, dateIndex) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + dateIndex * 0.05 + index * 0.02 }}
                        className="flex items-center gap-4 rounded-2xl bg-card/50 p-4 border border-border/30 hover:border-primary/30 transition-all duration-300 group"
                      >
                        <div
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                            transaction.type === 'income' && 'bg-income/10',
                            transaction.type === 'expense' && 'bg-expense/10',
                            transaction.type === 'transfer' && 'bg-transfer/10'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-6 w-6',
                              transaction.type === 'income' && 'text-income',
                              transaction.type === 'expense' && 'text-expense',
                              transaction.type === 'transfer' && 'text-transfer'
                            )}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">
                              {transaction.payee ||
                                (transaction.type === 'transfer'
                                  ? `Transfer to ${(transaction.to_account as any)?.name || 'Account'}`
                                  : (transaction.category as any)?.name || 'Uncategorized')}
                            </p>
                            {transaction.is_recurring && (
                              <Repeat className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{(transaction.account as any)?.name}</span>
                            {(transaction.category as any)?.name && (
                              <>
                                <span>•</span>
                                <span>{(transaction.category as any).name}</span>
                              </>
                            )}
                          </div>
                          {transaction.notes && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {transaction.notes}
                            </p>
                          )}
                        </div>

                        {transaction.tags && transaction.tags.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1">
                            {transaction.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                              >
                                <Tag className="h-3 w-3" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <span
                          className={cn(
                            'text-lg font-bold tabular-nums',
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
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem>Add tags</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteTransaction.mutate(transaction.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
