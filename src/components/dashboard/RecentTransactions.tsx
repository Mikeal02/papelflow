import { memo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2, ChevronRight } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const RecentTransactions = memo(function RecentTransactions() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { formatCurrency } = useCurrency();
  const recentTransactions = transactions.slice(0, 6);

  if (isLoading) {
    return (
      <div className="stat-card flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="stat-card relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />

      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Recent Transactions</h3>
            <p className="text-[10px] text-muted-foreground">{transactions.length} total this month</p>
          </div>
        </div>
        <Link to="/transactions">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-8 gap-1">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center border border-border/50 mb-4">
            <ArrowLeftRight className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold mb-1">No transactions yet</p>
          <p className="text-sm text-muted-foreground">Add your first transaction to get started</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recentTransactions.map((transaction) => {
            const Icon =
              transaction.type === 'income' ? ArrowUpRight
              : transaction.type === 'transfer' ? ArrowLeftRight
              : ArrowDownLeft;

            const isLarge = Number(transaction.amount) >= 500;

            return (
              <div
                key={transaction.id}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200 cursor-pointer',
                  'hover:translate-x-1 hover:bg-muted/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-transform duration-200 hover:scale-110',
                    transaction.type === 'income' && 'bg-gradient-to-br from-income/20 to-income/10',
                    transaction.type === 'expense' && 'bg-gradient-to-br from-expense/20 to-expense/10',
                    transaction.type === 'transfer' && 'bg-gradient-to-br from-muted to-muted/80'
                  )}
                >
                  <Icon className={cn(
                    'h-4.5 w-4.5',
                    transaction.type === 'income' && 'text-income',
                    transaction.type === 'expense' && 'text-expense',
                    transaction.type === 'transfer' && 'text-muted-foreground'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {transaction.payee ||
                        (transaction.type === 'transfer'
                          ? `Transfer to ${(transaction.to_account as any)?.name || 'Account'}`
                          : (transaction.category as any)?.name || 'Uncategorized')}
                    </p>
                    {isLarge && transaction.type === 'expense' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                        Large
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span className="truncate">{(transaction.account as any)?.name}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    <span>{format(new Date(transaction.date), 'MMM d')}</span>
                  </p>
                </div>

                <span
                  className={cn(
                    'font-bold tabular-nums text-sm truncate max-w-[100px] sm:max-w-[130px] flex-shrink-0',
                    transaction.type === 'income' && 'text-income',
                    transaction.type === 'expense' && 'text-expense',
                    transaction.type === 'transfer' && 'text-muted-foreground'
                  )}
                >
                  {formatCurrency(
                    Number(transaction.amount) * (transaction.type === 'expense' ? -1 : 1),
                    transaction.type !== 'transfer'
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {recentTransactions.length > 4 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      )}
    </motion.div>
  );
});
