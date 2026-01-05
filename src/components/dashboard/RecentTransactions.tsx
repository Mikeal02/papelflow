import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { mockTransactions, mockAccounts, mockCategories } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function RecentTransactions() {
  const recentTransactions = mockTransactions.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <Link to="/transactions">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            View all
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        {recentTransactions.map((transaction, index) => {
          const account = mockAccounts.find((a) => a.id === transaction.accountId);
          const category = transaction.categoryId
            ? mockCategories.find((c) => c.id === transaction.categoryId)
            : null;
          const toAccount = transaction.toAccountId
            ? mockAccounts.find((a) => a.id === transaction.toAccountId)
            : null;

          const Icon =
            transaction.type === 'income'
              ? ArrowUpRight
              : transaction.type === 'transfer'
              ? ArrowLeftRight
              : ArrowDownLeft;

          return (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.04 }}
              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  transaction.type === 'income' && 'bg-income/10',
                  transaction.type === 'expense' && 'bg-expense/10',
                  transaction.type === 'transfer' && 'bg-transfer/10'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    transaction.type === 'income' && 'text-income',
                    transaction.type === 'expense' && 'text-expense',
                    transaction.type === 'transfer' && 'text-transfer'
                  )}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {transaction.payee ||
                    (transaction.type === 'transfer'
                      ? `Transfer to ${toAccount?.name}`
                      : category?.name)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {account?.name} • {format(new Date(transaction.date), 'MMM d')}
                </p>
              </div>

              <span
                className={cn(
                  'font-semibold tabular-nums',
                  transaction.type === 'income' && 'amount-positive',
                  transaction.type === 'expense' && 'amount-negative',
                  transaction.type === 'transfer' && 'amount-neutral'
                )}
              >
                {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}$
                {transaction.amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
