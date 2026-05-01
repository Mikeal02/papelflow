import { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useUpdateTransaction, useTransactions, type Transaction } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { findDuplicates, type DuplicateMatch } from '@/lib/duplicate-detection';
import { DuplicateWarningDialog } from '@/components/transactions/DuplicateWarningDialog';

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

type TransactionType = 'expense' | 'income' | 'transfer';

const transactionTypes = [
  { type: 'expense' as const, label: 'Expense', icon: ArrowDownLeft, color: 'expense' },
  { type: 'income' as const, label: 'Income', icon: ArrowUpRight, color: 'income' },
  { type: 'transfer' as const, label: 'Transfer', icon: ArrowLeftRight, color: 'transfer' },
];

export function EditTransactionModal({ open, onOpenChange, transaction }: EditTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: allTransactions = [] } = useTransactions();
  const updateTransaction = useUpdateTransaction();
  const { currencySymbol } = useCurrency();
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type as TransactionType);
      setAmount(String(transaction.amount));
      setAccountId(transaction.account_id);
      setToAccountId(transaction.to_account_id || '');
      setCategoryId(transaction.category_id || '');
      setPayee(transaction.payee || '');
      setNotes(transaction.notes || '');
      setDate(transaction.date);
    }
  }, [transaction]);

  const filteredCategories = categories.filter(
    (cat) => cat.type === (type === 'income' ? 'income' : 'expense')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    await updateTransaction.mutateAsync({
      id: transaction.id,
      updates: {
        type,
        amount: parseFloat(amount),
        date,
        account_id: accountId,
        category_id: type !== 'transfer' ? categoryId || null : null,
        to_account_id: type === 'transfer' ? toAccountId || null : null,
        payee: payee || null,
        notes: notes || null,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Transaction</DialogTitle>
          <DialogDescription>Update the details of this transaction</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {transactionTypes.map(({ type: t, label, icon: Icon, color }) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                  type === t
                    ? color === 'expense'
                      ? 'bg-expense text-white shadow-sm'
                      : color === 'income'
                      ? 'bg-income text-white shadow-sm'
                      : 'bg-transfer text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">
                {currencySymbol}
              </span>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-2xl font-bold h-14"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Account</Label>
              <Select value={accountId} onValueChange={setAccountId} required>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === 'transfer' ? (
              <div className="space-y-2">
                <Label>To Account</Label>
                <Select value={toAccountId} onValueChange={setToAccountId} required>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 h-10"
                  required
                />
              </div>
            </div>

            {type !== 'transfer' && (
              <div className="space-y-2">
                <Label htmlFor="edit-payee">{type === 'income' ? 'From' : 'Payee'}</Label>
                <Input
                  id="edit-payee"
                  placeholder={type === 'income' ? 'Source' : 'Merchant name'}
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="h-10"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              placeholder="Add any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-10"
              disabled={updateTransaction.isPending}
            >
              {updateTransaction.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
