import { motion } from 'framer-motion';
import { Wallet, PiggyBank, CreditCard, Banknote } from 'lucide-react';
import { mockAccounts, getNetWorth } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const accountIcons = {
  bank: Wallet,
  cash: Banknote,
  credit_card: CreditCard,
  wallet: Wallet,
  loan: CreditCard,
  investment: PiggyBank,
};

export function AccountsOverview() {
  const netWorth = getNetWorth();

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
              ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <Link to="/accounts">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            Manage
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {mockAccounts.map((account, index) => {
          const Icon = accountIcons[account.type] || Wallet;
          const isNegative = account.balance < 0;

          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + index * 0.05 }}
              className="flex items-center gap-3 rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${account.color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: account.color }} />
              </div>

              <div className="flex-1">
                <p className="font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {account.type.replace('_', ' ')}
                </p>
              </div>

              <span
                className={cn(
                  'font-semibold tabular-nums',
                  isNegative ? 'amount-negative' : 'text-foreground'
                )}
              >
                {isNegative ? '-' : ''}$
                {Math.abs(account.balance).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
