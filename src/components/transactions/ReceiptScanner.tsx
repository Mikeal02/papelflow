import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Loader2, Check, Receipt, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';

interface ScannedData {
  merchant: string | null;
  date: string | null;
  total: number | null;
  items: { name: string; amount: number }[];
  category: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export const ReceiptScanner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [editedAmount, setEditedAmount] = useState<string>('');
  const [editedPayee, setEditedPayee] = useState<string>('');
  const [editedDate, setEditedDate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const createTransaction = useCreateTransaction();
  const { formatCurrency } = useCurrency();

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      await scanReceipt(base64);
    };
    reader.readAsDataURL(file);
  };

  const scanReceipt = async (imageBase64: string) => {
    setIsScanning(true);
    setScannedData(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageBase64 }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to scan receipt');
      }

      const data = result.data as ScannedData;
      setScannedData(data);
      
      // Pre-fill form
      setEditedAmount(data.total?.toString() || '');
      setEditedPayee(data.merchant || '');
      setEditedDate(data.date || new Date().toISOString().split('T')[0]);
      
      // Try to match category
      if (data.category) {
        const matchedCategory = expenseCategories.find(
          c => c.name.toLowerCase().includes(data.category!.toLowerCase()) ||
               data.category!.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedCategory) {
          setSelectedCategory(matchedCategory.id);
        }
      }

      // Default to first account
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0].id);
      }

      toast.success('Receipt scanned successfully!');
    } catch (error) {
      console.error('Scan error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to scan receipt');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!editedAmount || !selectedAccount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        type: 'expense',
        amount: parseFloat(editedAmount),
        date: editedDate || new Date().toISOString().split('T')[0],
        account_id: selectedAccount,
        category_id: selectedCategory || undefined,
        payee: editedPayee || undefined,
        notes: scannedData?.items?.map(i => `${i.name}: ${formatCurrency(i.amount)}`).join('\n') || undefined,
      });

      toast.success('Transaction created from receipt!');
      handleClose();
    } catch (error) {
      console.error('Create transaction error:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setScannedData(null);
    setImagePreview(null);
    setEditedAmount('');
    setEditedPayee('');
    setEditedDate('');
    setSelectedCategory('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-income/20 text-income',
      medium: 'bg-chart-4/20 text-chart-4',
      low: 'bg-destructive/20 text-destructive',
    };
    return colors[confidence as keyof typeof colors] || colors.medium;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Receipt className="h-4 w-4" />
          <span className="hidden sm:inline">Scan Receipt</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Receipt Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          {!imagePreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Take a photo or upload</p>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG up to 10MB
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Choose Image
                </Button>
              </div>
            </motion.div>
          )}

          {/* Image Preview */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative"
              >
                <img
                  src={imagePreview}
                  alt="Receipt"
                  className="w-full max-h-48 object-contain rounded-lg border"
                />
                {!isScanning && !scannedData && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80"
                    onClick={() => {
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {isScanning && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-sm">Analyzing receipt...</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanned Data Form */}
          <AnimatePresence>
            {scannedData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Confidence Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Scan confidence:</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceBadge(scannedData.confidence)}`}>
                    {scannedData.confidence}
                  </span>
                </div>

                {/* Merchant */}
                <div className="space-y-2">
                  <Label>Merchant</Label>
                  <Input
                    value={editedPayee}
                    onChange={(e) => setEditedPayee(e.target.value)}
                    placeholder="Store name"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Total Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedAmount}
                    onChange={(e) => setEditedAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account */}
                <div className="space-y-2">
                  <Label>Account *</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Items Preview */}
                {scannedData.items && scannedData.items.length > 0 && (
                  <div className="space-y-2">
                    <Label>Items Detected</Label>
                    <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                      {scannedData.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm py-1">
                          <span className="truncate flex-1">{item.name}</span>
                          <span className="text-muted-foreground ml-2">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setScannedData(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Scan Another
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleCreateTransaction}
                    disabled={createTransaction.isPending || !editedAmount || !selectedAccount}
                  >
                    {createTransaction.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Create Transaction
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
