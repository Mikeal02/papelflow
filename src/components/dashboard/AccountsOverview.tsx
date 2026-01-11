import { motion } from 'framer-motion';
import { Wallet, PiggyBank, CreditCard, Banknote, Building2, Loader2 } from 'lucide-react';
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="stat-card flex items-center justify-center min-h-[200px]"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold">Accounts</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Net worth:{' '}
            <span className={cn('font-semibold', netWorth >= 0 ? 'text-income' : 'text-expense')}>
              {formatCurrency(netWorth)}
            </span>
          </p>
        </div>
        <Link to="/accounts">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            Manage
          </Button>
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No accounts yet</p>
          <p className="text-sm text-muted-foreground">Add your first account to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.slice(0, 4).map((account, index) => {
            const Icon = accountIcons[account.type] || Wallet;
            const isNegative = Number(account.balance) < 0;

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + index * 0.05 }}
                className="flex items-center gap-3 rounded-xl p-3 bg-muted/20 hover:bg-muted/40 transition-all duration-300"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  <Icon className="h-5 w-5" style={{ color: account.color || undefined }} />
                </div>

                <div className="flex-1">
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {account.type.replace('_', ' ')}
                  </p>
                </div>

                <span
                  className={cn(
                    'font-semibold tabular-nums text-sm sm:text-base truncate max-w-[100px] sm:max-w-[140px]',
                    isNegative ? 'amount-negative' : 'text-foreground'
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
