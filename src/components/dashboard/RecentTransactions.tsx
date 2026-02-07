import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2, ChevronRight } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function RecentTransactions() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { formatCurrency } = useCurrency();
  const recentTransactions = transactions.slice(0, 6);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="stat-card flex items-center justify-center min-h-[300px]"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Recent Transactions</h3>
        <Link to="/transactions">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-8 gap-1">
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
            <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No transactions yet</p>
          <p className="text-sm text-muted-foreground">Add your first transaction to get started</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recentTransactions.map((transaction, index) => {
            const Icon =
              transaction.type === 'income'
                ? ArrowUpRight
                : transaction.type === 'transfer'
                ? ArrowLeftRight
                : ArrowDownLeft;

            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.03 }}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors duration-200 hover:bg-muted/50 group"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
                    transaction.type === 'income' && 'bg-income/10',
                    transaction.type === 'expense' && 'bg-expense/10',
                    transaction.type === 'transfer' && 'bg-transfer/10'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      transaction.type === 'income' && 'text-income',
                      transaction.type === 'expense' && 'text-expense',
                      transaction.type === 'transfer' && 'text-transfer'
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {transaction.payee ||
                      (transaction.type === 'transfer'
                        ? `Transfer to ${(transaction.to_account as any)?.name || 'Account'}`
                        : (transaction.category as any)?.name || 'Uncategorized')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(transaction.account as any)?.name} • {format(new Date(transaction.date), 'MMM d')}
                  </p>
                </div>

                <span
                  className={cn(
                    'font-semibold tabular-nums text-sm truncate max-w-[90px] sm:max-w-[120px] flex-shrink-0',
                    transaction.type === 'income' && 'text-income',
                    transaction.type === 'expense' && 'text-expense',
                    transaction.type === 'transfer' && 'text-muted-foreground'
                  )}
                  title={formatCurrency(
                    Number(transaction.amount) * (transaction.type === 'expense' ? -1 : 1),
                    transaction.type !== 'transfer'
                  )}
                >
                  {formatCurrency(
                    Number(transaction.amount) * (transaction.type === 'expense' ? -1 : 1),
                    transaction.type !== 'transfer'
                  )}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
