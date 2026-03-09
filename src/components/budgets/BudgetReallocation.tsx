import { useState, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useUpdateBudget } from '@/hooks/useBudgets';
import { ArrowRight, GripVertical, Loader2, Check, X, Zap, ArrowLeftRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BudgetItem {
  id: string;
  category_id: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

interface BudgetReallocationProps {
  budgets: BudgetItem[];
  onClose: () => void;
}

export function BudgetReallocation({ budgets, onClose }: BudgetReallocationProps) {
  const { formatCurrency } = useCurrency();
  const updateBudget = useUpdateBudget();
  
  // Local state for amounts during reallocation
  const [localAmounts, setLocalAmounts] = useState<Record<string, number>>(
    budgets.reduce((acc, b) => ({ ...acc, [b.id]: Number(b.amount) }), {})
  );
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const originalTotal = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const currentTotal = Object.values(localAmounts).reduce((sum, a) => sum + a, 0);
  const hasChanges = budgets.some(b => localAmounts[b.id] !== Number(b.amount));

  const getCategoryIcon = (icon?: string) => {
    const icons: Record<string, string> = {
      'home': '🏠', 'shopping-cart': '🛒', 'car': '🚗', 'zap': '⚡',
      'heart-pulse': '💊', 'utensils': '🍽️', 'film': '🎬', 'shopping-bag': '🛍️',
      'repeat': '📺', 'sparkles': '✨'
    };
    return icons[icon || ''] || '📁';
  };

  const handleDragStart = (budgetId: string) => {
    setDragSource(budgetId);
  };

  const handleDragOver = (e: React.DragEvent, budgetId: string) => {
    e.preventDefault();
    if (budgetId !== dragSource) {
      setDragTarget(budgetId);
    }
  };

  const handleDragLeave = () => {
    setDragTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragSource && dragSource !== targetId) {
      setShowTransferModal(true);
    }
    setDragTarget(null);
  };

  const handleDragEnd = () => {
    if (!showTransferModal) {
      setDragSource(null);
      setDragTarget(null);
    }
  };

  const executeTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (!dragSource || !dragTarget || isNaN(amount) || amount <= 0) return;

    const sourceAmount = localAmounts[dragSource];
    if (amount > sourceAmount) {
      toast({ 
        title: 'Insufficient budget', 
        description: 'Cannot transfer more than available',
        variant: 'destructive' 
      });
      return;
    }

    setLocalAmounts(prev => ({
      ...prev,
      [dragSource]: prev[dragSource] - amount,
      [dragTarget]: prev[dragTarget] + amount,
    }));

    setShowTransferModal(false);
    setTransferAmount('');
    setDragSource(null);
    setDragTarget(null);

    const sourceBudget = budgets.find(b => b.id === dragSource);
    const targetBudget = budgets.find(b => b.id === dragTarget);
    toast({ 
      title: 'Budget reallocated',
      description: `Moved ${formatCurrency(amount)} from ${sourceBudget?.category?.name} to ${targetBudget?.category?.name}`
    });
  };

  const quickTransfer = (fromId: string, toId: string, amount: number) => {
    const sourceAmount = localAmounts[fromId];
    const transferAmt = Math.min(amount, sourceAmount);
    
    setLocalAmounts(prev => ({
      ...prev,
      [fromId]: prev[fromId] - transferAmt,
      [toId]: prev[toId] + transferAmt,
    }));
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const updates = budgets
        .filter(b => localAmounts[b.id] !== Number(b.amount))
        .map(b => updateBudget.mutateAsync({ id: b.id, amount: localAmounts[b.id] }));
      
      await Promise.all(updates);
      onClose();
    } catch (error) {
      toast({ title: 'Failed to save changes', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    setLocalAmounts(budgets.reduce((acc, b) => ({ ...acc, [b.id]: Number(b.amount) }), {}));
  };

  const sourceBudget = budgets.find(b => b.id === dragSource);
  const targetBudget = budgets.find(b => b.id === dragTarget);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="stat-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Reallocate Budget</h3>
            <p className="text-xs text-muted-foreground">Drag & drop to move money between categories</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Total Summary */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 mb-4">
        <span className="text-sm text-muted-foreground">Total Budget</span>
        <span className={cn(
          "font-bold",
          currentTotal !== originalTotal && "text-warning"
        )}>
          {formatCurrency(currentTotal)}
        </span>
      </div>

      {/* Budget Items Grid */}
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {budgets.map((budget, index) => {
          const currentAmount = localAmounts[budget.id];
          const originalAmount = Number(budget.amount);
          const diff = currentAmount - originalAmount;
          const isSource = dragSource === budget.id;
          const isTarget = dragTarget === budget.id;
          
          return (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: isTarget ? 1.02 : 1,
                borderColor: isTarget ? 'hsl(var(--primary))' : 'transparent'
              }}
              transition={{ delay: index * 0.05 }}
              draggable
              onDragStart={() => handleDragStart(budget.id)}
              onDragOver={(e) => handleDragOver(e, budget.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, budget.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing",
                "bg-card hover:bg-muted/30",
                isSource && "opacity-50 scale-95",
                isTarget && "ring-2 ring-primary/50 bg-primary/5",
                !isSource && !isTarget && "border-transparent"
              )}
            >
              {/* Drag Handle */}
              <div className="absolute top-2 right-2 text-muted-foreground/50">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Category Info */}
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-transform"
                  style={{ backgroundColor: `${budget.category?.color}20` }}
                >
                  {getCategoryIcon(budget.category?.icon)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm truncate">{budget.category?.name}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(budget.spent)} spent • {budget.percentage.toFixed(0)}% used
                  </p>
                </div>
              </div>

              {/* Amount Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Budget</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatCurrency(currentAmount)}</span>
                    {diff !== 0 && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] h-5",
                          diff > 0 ? "border-income/30 text-income" : "border-expense/30 text-expense"
                        )}
                      >
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div 
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      budget.percentage >= 100 ? "bg-expense" : 
                      budget.percentage >= 80 ? "bg-warning" : "bg-primary"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((budget.spent / currentAmount) * 100, 100)}%` }}
                  />
                </div>

                {/* Quick Transfer Buttons */}
                <div className="flex gap-1 pt-1">
                  {budgets.filter(b => b.id !== budget.id).slice(0, 2).map(otherBudget => (
                    <Button
                      key={otherBudget.id}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => {
                        setDragSource(budget.id);
                        setDragTarget(otherBudget.id);
                        setShowTransferModal(true);
                      }}
                    >
                      <ArrowRight className="h-3 w-3" />
                      {otherBudget.category?.name?.slice(0, 8)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Drop Indicator */}
              <AnimatePresence>
                {isTarget && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-xl backdrop-blur-[1px]"
                  >
                    <span className="text-sm font-semibold text-primary">Drop here</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <Button variant="ghost" onClick={resetChanges} disabled={!hasChanges || isSaving}>
          Reset
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={saveChanges} 
            disabled={!hasChanges || isSaving}
            className="gap-2 btn-premium"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && sourceBudget && targetBudget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowTransferModal(false);
              setDragSource(null);
              setDragTarget(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="text-center">
                  <div 
                    className="h-12 w-12 mx-auto rounded-xl flex items-center justify-center text-xl mb-2"
                    style={{ backgroundColor: `${sourceBudget.category?.color}20` }}
                  >
                    {getCategoryIcon(sourceBudget.category?.icon)}
                  </div>
                  <p className="text-sm font-medium truncate max-w-[100px]">{sourceBudget.category?.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(localAmounts[sourceBudget.id])}</p>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <Zap className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="text-center">
                  <div 
                    className="h-12 w-12 mx-auto rounded-xl flex items-center justify-center text-xl mb-2"
                    style={{ backgroundColor: `${targetBudget.category?.color}20` }}
                  >
                    {getCategoryIcon(targetBudget.category?.icon)}
                  </div>
                  <p className="text-sm font-medium truncate max-w-[100px]">{targetBudget.category?.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(localAmounts[targetBudget.id])}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Transfer Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="text-center text-lg font-bold"
                    autoFocus
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  {[25, 50, 100, localAmounts[sourceBudget.id]].map((amount, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setTransferAmount(String(Math.min(amount, localAmounts[sourceBudget.id])))}
                    >
                      {i === 3 ? 'All' : formatCurrency(amount)}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowTransferModal(false);
                      setDragSource(null);
                      setDragTarget(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 btn-premium" 
                    onClick={executeTransfer}
                    disabled={!transferAmount || parseFloat(transferAmount) <= 0}
                  >
                    Transfer
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
