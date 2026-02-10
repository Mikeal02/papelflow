import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
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
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckSquare,
  Trash2,
  Tag,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { exportTransactionsToCSV } from '@/lib/export-utils';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const PAGE_SIZE = 25;

const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last 6 Months', value: '6m' },
];

const Transactions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const deleteTransaction = useDeleteTransaction();
  const { formatCurrency } = useCurrency();

  const dateInterval = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today': return { start: new Date(now.toDateString()), end: now };
      case '7d': return { start: subDays(now, 7), end: now };
      case '30d': return { start: subDays(now, 30), end: now };
      case 'this-month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case '3m': return { start: subMonths(now, 3), end: now };
      case '6m': return { start: subMonths(now, 6), end: now };
      default: return null;
    }
  }, [dateRange]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        searchQuery === '' ||
        transaction.payee?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesAccount = accountFilter === 'all' || transaction.account_id === accountFilter;
      const matchesCategory = categoryFilter === 'all' || transaction.category_id === categoryFilter;
      const matchesDate = !dateInterval || isWithinInterval(new Date(transaction.date), dateInterval);
      return matchesSearch && matchesType && matchesAccount && matchesCategory && matchesDate;
    });
  }, [transactions, searchQuery, typeFilter, accountFilter, categoryFilter, dateInterval]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Summary stats for filtered
  const filteredStats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expenses, net: income - expenses, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const groupedTransactions = paginatedTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === paginatedTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTransactions.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteTransaction.mutateAsync(id);
    }
    setSelectedIds(new Set());
    toast({ title: `Deleted ${selectedIds.size} transactions` });
  };

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast({ title: 'No transactions to export', variant: 'destructive' });
      return;
    }
    exportTransactionsToCSV(filteredTransactions, formatCurrency);
    toast({ title: 'Export successful!', description: `Exported ${filteredTransactions.length} transactions` });
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
        <label className="text-sm font-semibold">Date Range</label>
        <Select value={dateRange} onValueChange={v => { setDateRange(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full bg-muted/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">Type</label>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full bg-muted/30"><SelectValue /></SelectTrigger>
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
        <Select value={accountFilter} onValueChange={v => { setAccountFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full bg-muted/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold">Category</label>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full bg-muted/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
              {filteredStats.count} transactions found
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

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="stat-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Income</p>
            <p className="text-sm font-bold text-income">{formatCurrency(filteredStats.income)}</p>
          </div>
          <div className="stat-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Expenses</p>
            <p className="text-sm font-bold text-expense">{formatCurrency(filteredStats.expenses)}</p>
          </div>
          <div className="stat-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Net</p>
            <p className={cn('text-sm font-bold', filteredStats.net >= 0 ? 'text-income' : 'text-expense')}>
              {formatCurrency(filteredStats.net)}
            </p>
          </div>
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
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10 bg-muted/30 border-border/50"
            />
          </div>
          
          <div className="hidden lg:flex gap-2">
            <Select value={dateRange} onValueChange={v => { setDateRange(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[130px] bg-muted/30 border-border/50">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px] bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[130px] bg-muted/30 border-border/50">
                <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={v => { setAccountFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden shrink-0 border-border/50">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-2xl">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="mt-4 pb-4"><FilterContent /></div>
            </SheetContent>
          </Sheet>
        </motion.div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20"
          >
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="destructive" size="sm" className="ml-auto gap-1.5" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
          </motion.div>
        )}

        {/* Transactions List */}
        <AnimatePresence mode="popLayout">
          {filteredTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="stat-card flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                  <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">No transactions found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery || typeFilter !== 'all' || dateRange !== 'all' ? 'Try adjusting your filters' : 'Add your first transaction to start tracking'}
              </p>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Select All */}
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  checked={selectedIds.size === paginatedTransactions.length && paginatedTransactions.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-xs text-muted-foreground">Select all on page</span>
              </div>

              {sortedDates.map((date, dateIndex) => (
                <motion.div 
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + dateIndex * 0.03 }}
                >
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 sticky top-16 md:top-0 bg-background/90 backdrop-blur-sm py-2 z-10 border-b border-border/30">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="space-y-2">
                    {groupedTransactions[date].map((transaction, index) => {
                      const Icon = transaction.type === 'income' ? ArrowUpRight : transaction.type === 'transfer' ? ArrowLeftRight : ArrowDownLeft;
                      const isSelected = selectedIds.has(transaction.id);

                      return (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: dateIndex * 0.02 + index * 0.02 }}
                          className={cn(
                            'flex items-center gap-3 md:gap-4 rounded-xl bg-card/50 p-3.5 md:p-4 border border-border/30 hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-default',
                            isSelected && 'border-primary/50 bg-primary/5'
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(transaction.id)}
                            className="shrink-0"
                          />
                          <div
                            className={cn(
                              'flex h-10 w-10 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-xl transition-all',
                              transaction.type === 'income' && 'bg-gradient-to-br from-income/20 to-income/10',
                              transaction.type === 'expense' && 'bg-gradient-to-br from-expense/20 to-expense/10',
                              transaction.type === 'transfer' && 'bg-gradient-to-br from-transfer/20 to-transfer/10'
                            )}
                          >
                            <Icon className={cn(
                              'h-5 w-5',
                              transaction.type === 'income' && 'text-income',
                              transaction.type === 'expense' && 'text-expense',
                              transaction.type === 'transfer' && 'text-transfer'
                            )} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm truncate">
                                {transaction.payee ||
                                  (transaction.type === 'transfer'
                                    ? 'Transfer'
                                    : (transaction.category as any)?.name || 'Uncategorized')}
                              </p>
                              {transaction.is_recurring && (
                                <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                              {transaction.tags && transaction.tags.length > 0 && (
                                <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground hidden sm:inline">
                                  {transaction.tags[0]}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {(transaction.account as any)?.name}
                              {(transaction.category as any)?.name && <> • {(transaction.category as any).name}</>}
                              {transaction.notes && <> • {transaction.notes}</>}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-sm md:text-base font-bold tabular-nums',
                              transaction.type === 'income' && 'amount-positive',
                              transaction.type === 'expense' && 'amount-negative',
                              transaction.type === 'transfer' && 'amount-neutral'
                            )}>
                              {formatCurrency(Number(transaction.amount), transaction.type === 'income' || transaction.type === 'expense')}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
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

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between pt-4"
                >
                  <p className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages} • {filteredTransactions.length} total
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (page > totalPages || page < 1) return null;
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Transactions;
