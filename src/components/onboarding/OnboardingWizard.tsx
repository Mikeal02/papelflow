import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Tag, Target, PieChart, ArrowRight, ArrowLeft, Check, Sparkles,
  Building2, CreditCard, Landmark, Briefcase, Home, Car, Utensils, ShoppingBag,
  Zap, Heart, Plane, GraduationCap, Dumbbell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useCreateAccount } from '@/hooks/useAccounts';
import { useCreateCategory } from '@/hooks/useCategories';
import { useCreateGoal } from '@/hooks/useGoals';
import { useCreateBudget } from '@/hooks/useBudgets';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const steps = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'accounts', title: 'Accounts', icon: Wallet },
  { id: 'categories', title: 'Categories', icon: Tag },
  { id: 'budget', title: 'Budget', icon: PieChart },
  { id: 'goals', title: 'Goals', icon: Target },
  { id: 'complete', title: 'Done', icon: Check },
];

const defaultCategories = [
  { name: 'Housing', icon: 'home', color: '#3B82F6', group: 'Needs' },
  { name: 'Transportation', icon: 'car', color: '#8B5CF6', group: 'Needs' },
  { name: 'Food & Dining', icon: 'utensils', color: '#F59E0B', group: 'Needs' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#EC4899', group: 'Wants' },
  { name: 'Entertainment', icon: 'zap', color: '#10B981', group: 'Wants' },
  { name: 'Health', icon: 'heart', color: '#EF4444', group: 'Needs' },
  { name: 'Travel', icon: 'plane', color: '#06B6D4', group: 'Wants' },
  { name: 'Education', icon: 'graduation-cap', color: '#6366F1', group: 'Other' },
  { name: 'Fitness', icon: 'dumbbell', color: '#14B8A6', group: 'Other' },
];

const currencies = [
  { value: 'USD', label: '🇺🇸 USD' }, { value: 'EUR', label: '🇪🇺 EUR' },
  { value: 'GBP', label: '🇬🇧 GBP' }, { value: 'JPY', label: '🇯🇵 JPY' },
  { value: 'CAD', label: '🇨🇦 CAD' }, { value: 'AUD', label: '🇦🇺 AUD' },
  { value: 'INR', label: '🇮🇳 INR' }, { value: 'BRL', label: '🇧🇷 BRL' },
  { value: 'CHF', label: '🇨🇭 CHF' }, { value: 'MXN', label: '🇲🇽 MXN' },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<string>('bank');
  const [accountBalance, setAccountBalance] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const createAccount = useCreateAccount();
  const createCategory = useCreateCategory();
  const createGoal = useCreateGoal();
  const createBudget = useCreateBudget();

  const progress = ((currentStep) / (steps.length - 1)) * 100;

  const toggleCategory = (index: number) => {
    setSelectedCategories(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Save currency preference
      await supabase.from('profiles').update({ preferred_currency: currency }).eq('user_id', user.id);

      // Create account if provided
      if (accountName) {
        await createAccount.mutateAsync({
          name: accountName,
          type: accountType as any,
          balance: parseFloat(accountBalance) || 0,
          opening_balance: parseFloat(accountBalance) || 0,
          currency,
        });
      }

      // Create selected categories
      const categoriesToCreate = selectedCategories.map(i => defaultCategories[i]);
      for (const cat of categoriesToCreate) {
        await createCategory.mutateAsync({
          name: cat.name,
          type: 'expense',
          icon: cat.icon,
          color: cat.color,
          category_group: cat.group,
        });
      }

      // Create goal if provided
      if (goalName && goalAmount) {
        await createGoal.mutateAsync({
          name: goalName,
          target_amount: parseFloat(goalAmount),
          current_amount: 0,
        });
      }

      toast({ title: 'Setup complete!', description: 'Your financial dashboard is ready.' });
      onComplete();
    } catch (err) {
      toast({ title: 'Setup error', description: 'Some items may not have been saved.', variant: 'destructive' });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (currentStep === steps.length - 2) {
      handleComplete();
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const prev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const canProceed = () => {
    if (currentStep === 0) return true; // welcome
    if (currentStep === 1) return true; // accounts optional
    if (currentStep === 2) return selectedCategories.length > 0;
    if (currentStep === 3) return true; // budget optional
    if (currentStep === 4) return true; // goals optional
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-3">
            {steps.map((step, i) => (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  i < currentStep ? 'bg-primary text-primary-foreground' :
                  i === currentStep ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                  'bg-muted text-muted-foreground'
                )}>
                  {i < currentStep ? <Check className="h-4 w-4" /> : <step.icon className="h-3.5 w-3.5" />}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-lg min-h-[380px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              {/* Welcome */}
              {currentStep === 0 && (
                <div className="text-center space-y-6">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Sparkles className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to Finflow</h2>
                    <p className="text-muted-foreground text-sm">Let's set up your financial dashboard in a few quick steps.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Accounts */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Add Your First Account</h2>
                    <p className="text-muted-foreground text-sm">Optional — you can add more later.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Account Name</Label>
                      <Input placeholder="e.g., Main Checking" value={accountName} onChange={e => setAccountName(e.target.value)} className="h-11" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={accountType} onValueChange={setAccountType}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="wallet">Wallet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Balance</Label>
                        <Input type="number" placeholder="0.00" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} className="h-11" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Categories */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Choose Categories</h2>
                    <p className="text-muted-foreground text-sm">Select the spending categories you use most.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {defaultCategories.map((cat, i) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => toggleCategory(i)}
                        className={cn(
                          'p-3 rounded-xl border text-center text-xs font-medium transition-all',
                          selectedCategories.includes(i)
                            ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                        )}
                      >
                        <div className="h-8 w-8 mx-auto mb-1.5 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                          <span className="text-sm" style={{ color: cat.color }}>●</span>
                        </div>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Set a Monthly Budget</h2>
                    <p className="text-muted-foreground text-sm">Optional — set a target for your total monthly spending.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Monthly Budget</Label>
                    <Input type="number" placeholder="e.g., 3000" value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)} className="h-14 text-2xl font-bold" />
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
                    💡 You can create detailed per-category budgets from the Budgets page after setup.
                  </div>
                </div>
              )}

              {/* Goals */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Set a Savings Goal</h2>
                    <p className="text-muted-foreground text-sm">Optional — track progress toward something meaningful.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Goal Name</Label>
                      <Input placeholder="e.g., Emergency Fund" value={goalName} onChange={e => setGoalName(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Amount</Label>
                      <Input type="number" placeholder="e.g., 10000" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} className="h-11" />
                    </div>
                  </div>
                </div>
              )}

              {/* Complete */}
              {currentStep === 5 && (
                <div className="text-center space-y-6 py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-income to-accent flex items-center justify-center"
                  >
                    <Check className="h-10 w-10 text-primary-foreground" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
                    <p className="text-muted-foreground text-sm">Your financial dashboard is ready. Start tracking your money now.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <Button variant="outline" onClick={prev} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            <div className="flex-1" />
            {currentStep < steps.length - 1 ? (
              <Button onClick={next} disabled={!canProceed() || saving} className="gap-2 btn-premium">
                {saving ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : currentStep === steps.length - 2 ? (
                  <>Finish Setup <Check className="h-4 w-4" /></>
                ) : (
                  <>Continue <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            ) : (
              <Button onClick={onComplete} className="gap-2 btn-premium">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
