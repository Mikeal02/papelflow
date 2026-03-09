import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2, ChevronRight, Sparkles } from 'lucide-react';
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
        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
            <Loader2 className="h-8 w-8 text-primary relative" />
          </motion.div>
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="stat-card relative overflow-hidden"
    >
      {/* Background gradient */}
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
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:text-primary/80 h-8 gap-1 group/btn"
          >
            View all
            <motion.span
              className="inline-block"
              whileHover={{ x: 3 }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.span>
          </Button>
        </Link>
      </div>

      {recentTransactions.length === 0 ? (
        <motion.div 
          className="flex flex-col items-center justify-center py-14 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="relative mb-4"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center border border-border/50">
              <ArrowLeftRight className="h-7 w-7 text-muted-foreground" />
            </div>
          </motion.div>
          <p className="font-semibold mb-1">No transactions yet</p>
          <p className="text-sm text-muted-foreground">Add your first transaction to get started</p>
        </motion.div>
      ) : (
        <div className="space-y-1">
          {recentTransactions.map((transaction, index) => {
            const Icon =
              transaction.type === 'income'
                ? ArrowUpRight
                : transaction.type === 'transfer'
                ? ArrowLeftRight
                : ArrowDownLeft;

            const isLarge = Number(transaction.amount) >= 500;

            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.05, type: 'spring', stiffness: 300 }}
                whileHover={{ x: 4, backgroundColor: 'hsl(var(--muted) / 0.5)' }}
                className="relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200 group cursor-pointer"
              >
                {/* Hover glow effect */}
                <motion.div
                  className={cn(
                    "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    transaction.type === 'income' && "bg-gradient-to-r from-income/5 to-transparent",
                    transaction.type === 'expense' && "bg-gradient-to-r from-expense/5 to-transparent",
                    transaction.type === 'transfer' && "bg-gradient-to-r from-muted/30 to-transparent"
                  )}
                />
                
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                    transaction.type === 'income' && 'bg-gradient-to-br from-income/20 to-income/10',
                    transaction.type === 'expense' && 'bg-gradient-to-br from-expense/20 to-expense/10',
                    transaction.type === 'transfer' && 'bg-gradient-to-br from-muted to-muted/80'
                  )}
                  style={{
                    boxShadow: transaction.type === 'income' 
                      ? '0 4px 15px -4px hsl(var(--income) / 0.3)'
                      : transaction.type === 'expense'
                      ? '0 4px 15px -4px hsl(var(--expense) / 0.3)'
                      : undefined
                  }}
                >
                  <Icon
                    className={cn(
                      'h-4.5 w-4.5',
                      transaction.type === 'income' && 'text-income',
                      transaction.type === 'expense' && 'text-expense',
                      transaction.type === 'transfer' && 'text-muted-foreground'
                    )}
                  />
                </motion.div>

                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {transaction.payee ||
                        (transaction.type === 'transfer'
                          ? `Transfer to ${(transaction.to_account as any)?.name || 'Account'}`
                          : (transaction.category as any)?.name || 'Uncategorized')}
                    </p>
                    {isLarge && transaction.type === 'expense' && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium"
                      >
                        Large
                      </motion.span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span className="truncate">{(transaction.account as any)?.name}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    <span>{format(new Date(transaction.date), 'MMM d')}</span>
                  </p>
                </div>

                <motion.span
                  className={cn(
                    'relative font-bold tabular-nums text-sm truncate max-w-[100px] sm:max-w-[130px] flex-shrink-0',
                    transaction.type === 'income' && 'text-income',
                    transaction.type === 'expense' && 'text-expense',
                    transaction.type === 'transfer' && 'text-muted-foreground'
                  )}
                  title={formatCurrency(
                    Number(transaction.amount) * (transaction.type === 'expense' ? -1 : 1),
                    transaction.type !== 'transfer'
                  )}
                  whileHover={{ scale: 1.05 }}
                >
                  {formatCurrency(
                    Number(transaction.amount) * (transaction.type === 'expense' ? -1 : 1),
                    transaction.type !== 'transfer'
                  )}
                </motion.span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom gradient fade */}
      {recentTransactions.length > 4 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      )}
    </motion.div>
  );
}
