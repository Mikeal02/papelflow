import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Download,
  ExternalLink,
  Wallet,
  CreditCard,
  PiggyBank,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePlaid } from '@/hooks/usePlaid';
import { useCreateAccount, useAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlaidLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const accountTypeIcons: Record<string, typeof Wallet> = {
  depository: Building2,
  credit: CreditCard,
  investment: PiggyBank,
  loan: CreditCard,
};

const mapPlaidAccountType = (type: string, subtype: string): 'bank' | 'credit_card' | 'investment' | 'loan' | 'wallet' => {
  if (type === 'credit') return 'credit_card';
  if (type === 'investment') return 'investment';
  if (type === 'loan') return 'loan';
  if (subtype === 'savings') return 'wallet';
  return 'bank';
};

export const PlaidLinkModal = ({ open, onOpenChange }: PlaidLinkModalProps) => {
  const [step, setStep] = useState<'init' | 'connecting' | 'syncing' | 'importing' | 'complete' | 'error' | 'needs-setup'>('init');
  const [progress, setProgress] = useState(0);
  const [syncedAccounts, setSyncedAccounts] = useState<any[]>([]);
  const [syncedTransactions, setSyncedTransactions] = useState(0);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const { isLoading, needsSetup, createLinkToken, exchangePublicToken, getAccounts, getTransactions } = usePlaid();
  const createAccount = useCreateAccount();
  const createTransaction = useCreateTransaction();
  const { data: existingAccounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (needsSetup) {
      setStep('needs-setup');
    }
  }, [needsSetup]);

  const handleConnect = async () => {
    setStep('connecting');
    setProgress(10);

    const token = await createLinkToken();
    if (!token) {
      if (needsSetup) {
        setStep('needs-setup');
      } else {
        setStep('error');
      }
      return;
    }

    // In production, you would use Plaid Link here
    // For demo, we'll simulate the flow
    setProgress(30);

    // Simulate Plaid Link completion (in real app, this comes from Plaid Link callback)
    // For now, show message that Plaid Link SDK needs to be loaded
    toast({
      title: 'Plaid Link Ready',
      description: 'In production, Plaid Link would open here. Contact admin to complete setup.',
    });

    setProgress(50);
    setStep('syncing');

    // For demo purposes, we'll show the flow but note that real data requires Plaid Link SDK
    setTimeout(() => {
      setProgress(100);
      setStep('complete');
      toast({
        title: 'Demo Mode',
        description: 'Plaid integration is ready. Add your Plaid credentials to connect real bank accounts.',
      });
    }, 2000);
  };

  const handleSyncTransactions = async () => {
    if (!accessToken) return;

    setStep('importing');
    setProgress(0);

    const result = await getTransactions(accessToken);
    if (!result) {
      setStep('error');
      return;
    }

    const { added } = result;
    let imported = 0;

    // Find default account or first synced account
    const targetAccount = syncedAccounts[0];
    if (!targetAccount) {
      toast({ title: 'No accounts to import to', variant: 'destructive' });
      return;
    }

    for (const tx of added.slice(0, 50)) { // Limit to 50 for demo
      // Smart category matching
      const categoryName = tx.category?.[0]?.toLowerCase() || '';
      const matchedCategory = categories.find(c =>
        c.name.toLowerCase().includes(categoryName) ||
        categoryName.includes(c.name.toLowerCase())
      );

      await createTransaction.mutateAsync({
        amount: Math.abs(tx.amount),
        payee: tx.merchant_name || tx.name,
        type: tx.amount > 0 ? 'expense' : 'income',
        date: tx.date,
        account_id: targetAccount.id,
        category_id: matchedCategory?.id || null,
        notes: `Imported from bank: ${tx.name}`,
      });

      imported++;
      setProgress((imported / added.length) * 100);
      setSyncedTransactions(imported);
    }

    setStep('complete');
    toast({
      title: 'Transactions imported',
      description: `Successfully imported ${imported} transactions`,
    });
  };

  const resetModal = () => {
    setStep('init');
    setProgress(0);
    setSyncedAccounts([]);
    setSyncedTransactions(0);
    setAccessToken(null);
  };

  useEffect(() => {
    if (!open) {
      setTimeout(resetModal, 300);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Connect Bank Account
          </DialogTitle>
          <DialogDescription>
            Securely link your bank accounts to automatically import transactions
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AnimatePresence mode="wait">
            {step === 'init' && (
              <motion.div
                key="init"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                  <h4 className="font-semibold text-sm">What you get:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-income" />
                      Automatic transaction import
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-income" />
                      Real-time balance sync
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-income" />
                      Smart category matching
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-income" />
                      Bank-level security (256-bit encryption)
                    </li>
                  </ul>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LinkIcon className="h-3 w-3" />
                  Powered by Plaid • Read-only access • Cancel anytime
                </div>

                <Button
                  className="w-full btn-premium"
                  onClick={handleConnect}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Building2 className="h-4 w-4 mr-2" />
                  )}
                  Connect Your Bank
                </Button>
              </motion.div>
            )}

            {step === 'needs-setup' && (
              <motion.div
                key="needs-setup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold">Plaid Setup Required</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    To connect bank accounts, you need to configure Plaid API credentials.
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 text-left space-y-2">
                  <p className="text-xs font-medium">Required credentials:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• PLAID_CLIENT_ID</li>
                    <li>• PLAID_SECRET</li>
                    <li>• PLAID_ENV (sandbox/development/production)</li>
                  </ul>
                </div>
                <Button variant="outline" className="gap-2" asChild>
                  <a href="https://dashboard.plaid.com/signup" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Get Plaid Credentials
                  </a>
                </Button>
              </motion.div>
            )}

            {(step === 'connecting' || step === 'syncing' || step === 'importing') && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {step === 'connecting' && 'Connecting to Plaid...'}
                    {step === 'syncing' && 'Syncing accounts...'}
                    {step === 'importing' && `Importing transactions...`}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step === 'importing' && `${syncedTransactions} transactions imported`}
                  </p>
                </div>
                <Progress value={progress} className="h-2" />
              </motion.div>
            )}

            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-income/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-income" />
                </div>
                <div>
                  <h3 className="font-semibold">Integration Ready!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Plaid is configured. Add your credentials to start syncing.
                  </p>
                </div>

                {syncedAccounts.length > 0 && (
                  <div className="space-y-2">
                    {syncedAccounts.map((acc) => {
                      const Icon = accountTypeIcons[acc.type] || Wallet;
                      return (
                        <div key={acc.account_id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">{acc.name}</p>
                              <p className="text-xs text-muted-foreground">••••{acc.mask}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-sm">
                            {formatCurrency(acc.balances.current || 0)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                  {syncedAccounts.length > 0 && (
                    <Button className="flex-1 btn-premium gap-2" onClick={handleSyncTransactions}>
                      <Download className="h-4 w-4" />
                      Import Transactions
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">Connection Failed</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Unable to connect to your bank. Please try again.
                  </p>
                </div>
                <Button className="w-full" onClick={() => setStep('init')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
