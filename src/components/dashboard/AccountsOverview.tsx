import { motion } from 'framer-motion';
import { Wallet, PiggyBank, CreditCard, Banknote, Building2, Loader2, ChevronRight } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const accountIcons: Record<string, typeof Wallet> = {
  bank: Building2,
  cash: Banknote,
  credit_card: CreditCard,
  wallet: Wallet,
  loan: CreditCard,
  investment: PiggyBank,
};

export function AccountsOverview() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { formatCurrency } = useCurrency();
  const netWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="stat-card flex items-center justify-center min-h-[200px]"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Accounts</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Net worth:{' '}
            <span className={cn('font-semibold', netWorth >= 0 ? 'text-income' : 'text-expense')}>
              {formatCurrency(netWorth)}
            </span>
          </p>
        </div>
        <Link to="/accounts">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-8 gap-1">
            Manage
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No accounts yet</p>
          <p className="text-sm text-muted-foreground">Add your first account to start tracking</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.slice(0, 4).map((account, index) => {
            const Icon = accountIcons[account.type] || Wallet;
            const isNegative = Number(account.balance) < 0;

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + index * 0.04 }}
                className="flex items-center gap-3 rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${account.color}15` }}
                >
                  <Icon className="h-4 w-4" style={{ color: account.color || undefined }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {account.type.replace('_', ' ')}
                  </p>
                </div>

                <span
                  className={cn(
                    'font-semibold tabular-nums text-sm truncate max-w-[100px]',
                    isNegative ? 'text-expense' : 'text-foreground'
                  )}
                  title={formatCurrency(Number(account.balance))}
                >
                  {formatCurrency(Number(account.balance))}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
