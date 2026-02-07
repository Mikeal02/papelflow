import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useCategories } from '@/hooks/useCategories';
import { useCreateBudget } from '@/hooks/useBudgets';

interface AddBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
}

export function AddBudgetModal({ open, onOpenChange, month }: AddBudgetModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [rollover, setRollover] = useState(false);

  const { data: categories = [] } = useCategories();
  const createBudget = useCreateBudget();

  const expenseCategories = categories.filter((cat) => cat.type === 'expense');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createBudget.mutateAsync({
      category_id: categoryId,
      amount: parseFloat(amount),
      month,
      rollover,
    });
    
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCategoryId('');
    setAmount('');
    setRollover(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create Budget</DialogTitle>
          <DialogDescription>Set a spending limit for a category</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger className="h-10">
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
            <Label htmlFor="amount">Budget Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">
                $
              </span>
              <Input
                id="amount"
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

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="rollover" className="font-medium">Rollover unused budget</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Carry over unspent amounts to next month
              </p>
            </div>
            <Switch
              id="rollover"
              checked={rollover}
              onCheckedChange={setRollover}
            />
          </div>

          <div className="flex gap-3 pt-2">
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
              disabled={createBudget.isPending}
            >
              {createBudget.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Budget'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
