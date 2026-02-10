import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Palette, MoreHorizontal, Loader2, Folder, Tag } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';

const categoryColors = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#6366F1', '#F97316', '#06B6D4',
];

const categoryIcons = ['folder', 'home', 'car', 'utensils', 'shopping-bag', 'heart-pulse', 'zap', 'film', 'briefcase', 'gift'];

const iconEmojis: Record<string, string> = {
  folder: '📁', home: '🏠', car: '🚗', utensils: '🍽️', 'shopping-bag': '🛍️',
  'heart-pulse': '💊', zap: '⚡', film: '🎬', briefcase: '💼', gift: '🎁',
  'shopping-cart': '🛒', laptop: '💻', 'trending-up': '📈', 'plus-circle': '➕',
  repeat: '🔄', sparkles: '✨', target: '🎯',
};

const Categories = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', type: 'expense' as 'expense' | 'income', icon: 'folder', color: categoryColors[0], group: '' });
  const { data: categories = [], isLoading } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const { formatCurrency } = useCurrency();

  const spendingByCategory = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const spending: Record<string, number> = {};
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end && t.category_id;
      })
      .forEach(t => {
        spending[t.category_id!] = (spending[t.category_id!] || 0) + Number(t.amount);
      });
    return spending;
  }, [transactions]);

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCategory.mutateAsync({
      name: newCat.name,
      type: newCat.type,
      icon: newCat.icon,
      color: newCat.color,
      category_group: newCat.group || null,
    });
    setShowAdd(false);
    setNewCat({ name: '', type: 'expense', icon: 'folder', color: categoryColors[0], group: '' });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const renderCategories = (cats: typeof categories) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cats.map((cat, i) => (
        <motion.div
          key={cat.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.03 }}
          className="stat-card group p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: `${cat.color}15` }}
              >
                {iconEmojis[cat.icon || 'folder'] || '📁'}
              </div>
              <div>
                <h4 className="font-semibold text-sm">{cat.name}</h4>
                {cat.category_group && (
                  <p className="text-[10px] text-muted-foreground">{cat.category_group}</p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={() => deleteCategory.mutate(cat.id)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">This month</span>
            <span className="text-sm font-bold">
              {formatCurrency(spendingByCategory[cat.id] || 0)}
            </span>
          </div>
          {cat.budget_amount && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Budget</span>
                <span>{formatCurrency(Number(cat.budget_amount))}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(((spendingByCategory[cat.id] || 0) / Number(cat.budget_amount)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Categories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {categories.length} categories • {expenseCategories.length} expense, {incomeCategories.length} income
            </p>
          </div>
          <Button className="gap-2 btn-premium" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </motion.div>

        <Tabs defaultValue="expense" className="space-y-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="expense" className="gap-2">
              <Tag className="h-3.5 w-3.5" />
              Expense ({expenseCategories.length})
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-2">
              <Folder className="h-3.5 w-3.5" />
              Income ({incomeCategories.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expense">{renderCategories(expenseCategories)}</TabsContent>
          <TabsContent value="income">{renderCategories(incomeCategories)}</TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="gradient-text">New Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} required className="bg-muted/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newCat.type} onValueChange={(v: any) => setNewCat({ ...newCat, type: v })}>
                  <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={newCat.group} onValueChange={v => setNewCat({ ...newCat, group: v })}>
                  <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Needs">Needs</SelectItem>
                    <SelectItem value="Wants">Wants</SelectItem>
                    <SelectItem value="Income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {categoryIcons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCat({ ...newCat, icon })}
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center text-sm transition-all',
                      newCat.icon === icon ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                    )}
                  >
                    {iconEmojis[icon]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {categoryColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCat({ ...newCat, color })}
                    className={cn(
                      'h-7 w-7 rounded-full transition-transform',
                      newCat.color === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1 btn-premium" disabled={createCategory.isPending}>
                {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Categories;
