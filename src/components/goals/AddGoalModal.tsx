import { useState } from 'react';
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
import { useCreateGoal } from '@/hooks/useGoals';

interface AddGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GOAL_ICONS = [
  { value: 'shield', label: 'Emergency Fund', emoji: '🛡️' },
  { value: 'plane', label: 'Vacation', emoji: '✈️' },
  { value: 'car', label: 'Car', emoji: '🚗' },
  { value: 'home', label: 'Home', emoji: '🏠' },
  { value: 'target', label: 'General', emoji: '🎯' },
];

const COLORS = [
  '#2563eb', '#059669', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6'
];

export function AddGoalModal({ open, onOpenChange }: AddGoalModalProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('target');
  const [color, setColor] = useState('#2563eb');

  const createGoal = useCreateGoal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createGoal.mutateAsync({
      name,
      target_amount: parseFloat(targetAmount),
      current_amount: currentAmount ? parseFloat(currentAmount) : 0,
      deadline: deadline || null,
      icon,
      color,
    });
    
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setIcon('target');
    setColor('#2563eb');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create Goal</DialogTitle>
          <DialogDescription>Set a savings target to work towards</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              placeholder="e.g., Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="target"
                  type="number"
                  step="0.01"
                  placeholder="10,000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="pl-7 h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current">Already Saved</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="current"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="pl-7 h-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_ICONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <span className="flex items-center gap-2">
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-lg transition-all duration-200 ${
                    color === c ? 'ring-2 ring-offset-2 ring-ring' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              disabled={createGoal.isPending}
            >
              {createGoal.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Goal'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
