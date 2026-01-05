import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useCreateTransaction } from '@/hooks/useTransactions';
import { cn } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransactionType = 'expense' | 'income' | 'transfer';

const transactionTypes = [
  { type: 'expense' as const, label: 'Expense', icon: ArrowDownLeft, color: 'expense' },
  { type: 'income' as const, label: 'Income', icon: ArrowUpRight, color: 'income' },
  { type: 'transfer' as const, label: 'Transfer', icon: ArrowLeftRight, color: 'transfer' },
];

export function AddTransactionModal({ open, onOpenChange }: AddTransactionModalProps) {
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
  const createTransaction = useCreateTransaction();

  const filteredCategories = categories.filter(
    (cat) => cat.type === (type === 'income' ? 'income' : 'expense')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTransaction.mutateAsync({
      type,
      amount: parseFloat(amount),
      date,
      account_id: accountId,
      category_id: type !== 'transfer' ? categoryId : null,
      to_account_id: type === 'transfer' ? toAccountId : null,
      payee: payee || null,
      notes: notes || null,
    });
    
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount('');
    setAccountId('');
    setToAccountId('');
    setCategoryId('');
    setPayee('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold gradient-text">Add Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type Tabs */}
          <div className="flex gap-2 p-1.5 bg-muted/50 rounded-xl">
            {transactionTypes.map(({ type: t, label, icon: Icon, color }) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-300',
                  type === t
                    ? color === 'expense'
                      ? 'bg-expense text-foreground shadow-lg shadow-expense/20'
                      : color === 'income'
                      ? 'bg-income text-primary-foreground shadow-lg shadow-income/20'
                      : 'bg-transfer text-foreground shadow-lg shadow-transfer/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-2xl font-light">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-3xl font-bold h-16 bg-muted/30 border-border/50 focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Account */}
            <div className="space-y-2">
              <Label>From Account</Label>
              <Select value={accountId} onValueChange={setAccountId} required>
                <SelectTrigger className="h-11 bg-muted/30">
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

            {/* To Account (for transfers) or Category */}
            {type === 'transfer' ? (
              <div className="space-y-2">
                <Label>To Account</Label>
                <Select value={toAccountId} onValueChange={setToAccountId} required>
                  <SelectTrigger className="h-11 bg-muted/30">
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
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger className="h-11 bg-muted/30">
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

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 h-11 bg-muted/30"
                  required
                />
              </div>
            </div>

            {/* Payee */}
            {type !== 'transfer' && (
              <div className="space-y-2">
                <Label htmlFor="payee">{type === 'income' ? 'From' : 'Payee'}</Label>
                <Input
                  id="payee"
                  placeholder={type === 'income' ? 'Source' : 'Merchant name'}
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="h-11 bg-muted/30"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-muted/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-11 bg-gradient-sunset hover:opacity-90 text-primary-foreground font-semibold"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Add Transaction'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
