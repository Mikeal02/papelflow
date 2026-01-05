export type TransactionType = 'expense' | 'income' | 'transfer';

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'wallet' | 'loan' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  openingBalance: number;
  color: string;
  icon: string;
  isActive: boolean;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  group?: string;
  budget?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  accountId: string;
  categoryId?: string;
  toAccountId?: string;
  payee?: string;
  notes?: string;
  tags?: string[];
  isRecurring?: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  month: string;
  rollover: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  color: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDue: string;
  categoryId: string;
  accountId: string;
  isActive: boolean;
}
