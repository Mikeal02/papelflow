import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Calendar, Tag } from 'lucide-react';
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
import { mockAccounts, mockCategories } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { TransactionType } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  const filteredCategories = mockCategories.filter(
    (cat) => cat.type === (type === 'income' ? 'income' : 'expense')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual transaction creation
    toast({
      title: 'Transaction added',
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} of $${amount} has been recorded.`,
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
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type Tabs */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            {transactionTypes.map(({ type: t, label, icon: Icon, color }) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all',
                  type === t
                    ? color === 'expense'
                      ? 'bg-expense text-white shadow-sm'
                      : color === 'income'
                      ? 'bg-income text-primary-foreground shadow-sm'
                      : 'bg-transfer text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-2xl font-semibold h-14"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Account */}
            <div className="space-y-2">
              <Label>From Account</Label>
              <Select value={accountId} onValueChange={setAccountId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {mockAccounts.map((account) => (
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockAccounts
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
                  <SelectTrigger>
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
                  className="pl-10"
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
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
