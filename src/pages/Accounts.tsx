import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Building2,
  CreditCard,
  PiggyBank,
  Banknote,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockAccounts, getNetWorth } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { AccountType } from '@/lib/types';

const accountIcons: Record<AccountType, typeof Wallet> = {
  bank: Building2,
  cash: Banknote,
  credit_card: CreditCard,
  wallet: Wallet,
  loan: CreditCard,
  investment: PiggyBank,
};

const accountTypeLabels: Record<AccountType, string> = {
  bank: 'Bank Account',
  cash: 'Cash',
  credit_card: 'Credit Card',
  wallet: 'Digital Wallet',
  loan: 'Loan',
  investment: 'Investment',
};

const Accounts = () => {
  const netWorth = getNetWorth();

  const assets = mockAccounts
    .filter((a) => a.balance >= 0 || a.type === 'bank' || a.type === 'cash')
    .filter((a) => a.type !== 'credit_card' && a.type !== 'loan');

  const liabilities = mockAccounts.filter(
    (a) => a.type === 'credit_card' || a.type === 'loan'
  );

  const totalAssets = assets.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  const totalLiabilities = Math.abs(
    liabilities.reduce((sum, a) => sum + a.balance, 0)
  );

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
            <h1 className="text-3xl font-bold">Accounts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your financial accounts
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </motion.div>

        {/* Net Worth Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-5 md:grid-cols-3"
        >
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-income/10">
                <TrendingUp className="h-6 w-6 text-income" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold amount-positive">
                  ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-expense/10">
                <TrendingDown className="h-6 w-6 text-expense" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Liabilities</p>
                <p className="text-2xl font-bold amount-negative">
                  -${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card glow-effect">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Worth</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    netWorth >= 0 ? 'amount-positive' : 'amount-negative'
                  )}
                >
                  {netWorth < 0 && '-'}$
                  {Math.abs(netWorth).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Assets Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold mb-4">Assets</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((account, index) => {
              const Icon = accountIcons[account.type];

              return (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  className="stat-card group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: account.color }} />
                    </div>
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
                        <DropdownMenuItem>View transactions</DropdownMenuItem>
                        <DropdownMenuItem>Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold text-lg">{account.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {accountTypeLabels[account.type]}
                  </p>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-2xl font-bold">
                        ${account.balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Liabilities Section */}
        {liabilities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-4">Liabilities</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liabilities.map((account, index) => {
                const Icon = accountIcons[account.type];

                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + index * 0.05 }}
                    className="stat-card group border-expense/20"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        <Icon className="h-6 w-6" style={{ color: account.color }} />
                      </div>
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
                          <DropdownMenuItem>View transactions</DropdownMenuItem>
                          <DropdownMenuItem>Make payment</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-semibold text-lg">{account.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {accountTypeLabels[account.type]}
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Balance Owed</p>
                        <p className="text-2xl font-bold amount-negative">
                          ${Math.abs(account.balance).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Accounts;
