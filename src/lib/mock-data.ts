import { Account, Category, Transaction, Budget, Goal, Subscription } from './types';

export const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'Main Checking',
    type: 'bank',
    currency: 'USD',
    balance: 12450.00,
    openingBalance: 5000.00,
    color: 'hsl(160, 84%, 39%)',
    icon: 'building-2',
    isActive: true,
  },
  {
    id: '2',
    name: 'Savings',
    type: 'bank',
    currency: 'USD',
    balance: 28750.00,
    openingBalance: 10000.00,
    color: 'hsl(217, 91%, 60%)',
    icon: 'piggy-bank',
    isActive: true,
  },
  {
    id: '3',
    name: 'Credit Card',
    type: 'credit_card',
    currency: 'USD',
    balance: -1250.00,
    openingBalance: 0,
    color: 'hsl(0, 72%, 60%)',
    icon: 'credit-card',
    isActive: true,
  },
  {
    id: '4',
    name: 'Cash Wallet',
    type: 'cash',
    currency: 'USD',
    balance: 350.00,
    openingBalance: 200.00,
    color: 'hsl(38, 92%, 50%)',
    icon: 'wallet',
    isActive: true,
  },
];

export const mockCategories: Category[] = [
  // Expenses
  { id: 'cat-1', name: 'Housing', icon: 'home', color: 'hsl(217, 91%, 60%)', type: 'expense', group: 'Needs', budget: 2000 },
  { id: 'cat-2', name: 'Groceries', icon: 'shopping-cart', color: 'hsl(160, 84%, 39%)', type: 'expense', group: 'Needs', budget: 600 },
  { id: 'cat-3', name: 'Transportation', icon: 'car', color: 'hsl(38, 92%, 50%)', type: 'expense', group: 'Needs', budget: 400 },
  { id: 'cat-4', name: 'Utilities', icon: 'zap', color: 'hsl(280, 65%, 60%)', type: 'expense', group: 'Needs', budget: 200 },
  { id: 'cat-5', name: 'Dining Out', icon: 'utensils', color: 'hsl(0, 72%, 60%)', type: 'expense', group: 'Wants', budget: 300 },
  { id: 'cat-6', name: 'Entertainment', icon: 'film', color: 'hsl(320, 70%, 60%)', type: 'expense', group: 'Wants', budget: 200 },
  { id: 'cat-7', name: 'Shopping', icon: 'shopping-bag', color: 'hsl(180, 70%, 45%)', type: 'expense', group: 'Wants', budget: 250 },
  { id: 'cat-8', name: 'Health', icon: 'heart-pulse', color: 'hsl(350, 80%, 55%)', type: 'expense', group: 'Needs', budget: 150 },
  { id: 'cat-9', name: 'Subscriptions', icon: 'repeat', color: 'hsl(260, 60%, 55%)', type: 'expense', group: 'Wants', budget: 100 },
  { id: 'cat-10', name: 'Personal Care', icon: 'sparkles', color: 'hsl(45, 90%, 55%)', type: 'expense', group: 'Wants', budget: 100 },
  // Income
  { id: 'cat-11', name: 'Salary', icon: 'briefcase', color: 'hsl(160, 84%, 39%)', type: 'income' },
  { id: 'cat-12', name: 'Freelance', icon: 'laptop', color: 'hsl(217, 91%, 60%)', type: 'income' },
  { id: 'cat-13', name: 'Investments', icon: 'trending-up', color: 'hsl(38, 92%, 50%)', type: 'income' },
  { id: 'cat-14', name: 'Other Income', icon: 'plus-circle', color: 'hsl(180, 70%, 45%)', type: 'income' },
];

export const mockTransactions: Transaction[] = [
  { id: 't-1', type: 'expense', amount: 1800, date: '2026-01-03', accountId: '1', categoryId: 'cat-1', payee: 'Apartment Rent', notes: 'January rent payment' },
  { id: 't-2', type: 'income', amount: 5400, date: '2026-01-01', accountId: '1', categoryId: 'cat-11', payee: 'TechCorp Inc.', notes: 'Monthly salary', isRecurring: true },
  { id: 't-3', type: 'expense', amount: 156.32, date: '2026-01-04', accountId: '3', categoryId: 'cat-2', payee: 'Whole Foods Market' },
  { id: 't-4', type: 'expense', amount: 45.00, date: '2026-01-04', accountId: '1', categoryId: 'cat-3', payee: 'Shell Gas Station' },
  { id: 't-5', type: 'expense', amount: 78.50, date: '2026-01-03', accountId: '3', categoryId: 'cat-5', payee: 'The Italian Place', notes: 'Dinner with friends' },
  { id: 't-6', type: 'expense', amount: 14.99, date: '2026-01-02', accountId: '1', categoryId: 'cat-9', payee: 'Netflix', isRecurring: true },
  { id: 't-7', type: 'expense', amount: 9.99, date: '2026-01-02', accountId: '1', categoryId: 'cat-9', payee: 'Spotify', isRecurring: true },
  { id: 't-8', type: 'transfer', amount: 500, date: '2026-01-02', accountId: '1', toAccountId: '2', notes: 'Monthly savings transfer' },
  { id: 't-9', type: 'expense', amount: 234.50, date: '2026-01-01', accountId: '3', categoryId: 'cat-7', payee: 'Amazon', tags: ['electronics'] },
  { id: 't-10', type: 'expense', amount: 125.00, date: '2025-12-31', accountId: '1', categoryId: 'cat-4', payee: 'Electric Company' },
  { id: 't-11', type: 'income', amount: 850, date: '2025-12-28', accountId: '1', categoryId: 'cat-12', payee: 'Client Project', notes: 'Website redesign project' },
  { id: 't-12', type: 'expense', amount: 42.00, date: '2025-12-27', accountId: '4', categoryId: 'cat-5', payee: 'Coffee Shop' },
  { id: 't-13', type: 'expense', amount: 89.99, date: '2025-12-26', accountId: '3', categoryId: 'cat-10', payee: 'Pharmacy' },
  { id: 't-14', type: 'expense', amount: 15.00, date: '2025-12-25', accountId: '4', categoryId: 'cat-6', payee: 'Movie Theater' },
  { id: 't-15', type: 'income', amount: 125.50, date: '2025-12-20', accountId: '1', categoryId: 'cat-13', payee: 'Dividend Payment' },
];

export const mockBudgets: Budget[] = [
  { id: 'b-1', categoryId: 'cat-1', amount: 2000, spent: 1800, month: '2026-01', rollover: false },
  { id: 'b-2', categoryId: 'cat-2', amount: 600, spent: 156.32, month: '2026-01', rollover: true },
  { id: 'b-3', categoryId: 'cat-3', amount: 400, spent: 45, month: '2026-01', rollover: false },
  { id: 'b-4', categoryId: 'cat-4', amount: 200, spent: 125, month: '2026-01', rollover: false },
  { id: 'b-5', categoryId: 'cat-5', amount: 300, spent: 120.50, month: '2026-01', rollover: true },
  { id: 'b-6', categoryId: 'cat-6', amount: 200, spent: 15, month: '2026-01', rollover: false },
  { id: 'b-7', categoryId: 'cat-7', amount: 250, spent: 234.50, month: '2026-01', rollover: false },
  { id: 'b-8', categoryId: 'cat-8', amount: 150, spent: 0, month: '2026-01', rollover: true },
  { id: 'b-9', categoryId: 'cat-9', amount: 100, spent: 24.98, month: '2026-01', rollover: false },
  { id: 'b-10', categoryId: 'cat-10', amount: 100, spent: 89.99, month: '2026-01', rollover: false },
];

export const mockGoals: Goal[] = [
  { id: 'g-1', name: 'Emergency Fund', targetAmount: 15000, currentAmount: 8500, icon: 'shield', color: 'hsl(160, 84%, 39%)' },
  { id: 'g-2', name: 'Vacation', targetAmount: 5000, currentAmount: 2100, deadline: '2026-06-01', icon: 'plane', color: 'hsl(217, 91%, 60%)' },
  { id: 'g-3', name: 'New Car', targetAmount: 25000, currentAmount: 4500, deadline: '2027-01-01', icon: 'car', color: 'hsl(38, 92%, 50%)' },
];

export const mockSubscriptions: Subscription[] = [
  { id: 's-1', name: 'Netflix', amount: 14.99, frequency: 'monthly', nextDue: '2026-02-02', categoryId: 'cat-9', accountId: '1', isActive: true },
  { id: 's-2', name: 'Spotify', amount: 9.99, frequency: 'monthly', nextDue: '2026-02-02', categoryId: 'cat-9', accountId: '1', isActive: true },
  { id: 's-3', name: 'Gym Membership', amount: 45.00, frequency: 'monthly', nextDue: '2026-01-15', categoryId: 'cat-8', accountId: '1', isActive: true },
  { id: 's-4', name: 'Cloud Storage', amount: 2.99, frequency: 'monthly', nextDue: '2026-01-20', categoryId: 'cat-9', accountId: '1', isActive: true },
];

export const getMonthlyStats = () => {
  const currentMonth = '2026-01';
  const monthTransactions = mockTransactions.filter(t => t.date.startsWith(currentMonth));
  
  const income = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netFlow = income - expenses;
  
  const totalBudget = mockBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = mockBudgets.reduce((sum, b) => sum + b.spent, 0);
  
  return {
    income,
    expenses,
    netFlow,
    totalBudget,
    totalSpent,
    budgetProgress: (totalSpent / totalBudget) * 100,
  };
};

export const getCategorySpending = () => {
  const spending: Record<string, number> = {};
  
  mockTransactions
    .filter(t => t.type === 'expense' && t.categoryId)
    .forEach(t => {
      spending[t.categoryId!] = (spending[t.categoryId!] || 0) + t.amount;
    });
  
  return Object.entries(spending)
    .map(([categoryId, amount]) => ({
      category: mockCategories.find(c => c.id === categoryId)!,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
};

export const getNetWorth = () => {
  return mockAccounts.reduce((sum, acc) => sum + acc.balance, 0);
};
