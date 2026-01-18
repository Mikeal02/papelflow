import { useState, useEffect } from 'react';
import { Loader2, Calendar } from 'lucide-react';
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
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useUpdateSubscription, Subscription } from '@/hooks/useSubscriptions';

interface EditSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
}

export function EditSubscriptionModal({ open, onOpenChange, subscription }: EditSubscriptionModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDue, setNextDue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const updateSubscription = useUpdateSubscription();

  const expenseCategories = categories.filter((cat) => cat.type === 'expense');

  useEffect(() => {
    if (subscription) {
      setName(subscription.name);
      setAmount(String(subscription.amount));
      setFrequency(subscription.frequency);
      setNextDue(subscription.next_due.split('T')[0]);
      setCategoryId(subscription.category_id || '');
      setAccountId(subscription.account_id || '');
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscription) return;
    
    await updateSubscription.mutateAsync({
      id: subscription.id,
      name,
      amount: parseFloat(amount),
      frequency,
      next_due: nextDue,
      category_id: categoryId || null,
      account_id: accountId || null,
    });
    
    onOpenChange(false);
  };

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Subscription</DialogTitle>
          <DialogDescription>Update your subscription details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Subscription Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g., Netflix, Spotify"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-muted/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  placeholder="9.99"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 h-11 bg-muted/30"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                <SelectTrigger className="h-11 bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-nextDue">Next Due Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="edit-nextDue"
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
                className="pl-10 h-11 bg-muted/30"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category (Optional)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11 bg-muted/30">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Account (Optional)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
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
              className="flex-1 h-11"
              disabled={updateSubscription.isPending}
            >
              {updateSubscription.isPending ? (
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
