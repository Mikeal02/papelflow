import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle2, X, Download, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CSVRow {
  date: string;
  amount: string;
  type: string;
  payee: string;
  category: string;
  notes: string;
}

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CSVImportModal({ open, onOpenChange }: CSVImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const createTransaction = useCreateTransaction();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast({ title: 'Invalid CSV', description: 'File must have at least a header and one data row.', variant: 'destructive' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const rows: CSVRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: CSVRow = {
          date: values[headers.indexOf('date')] || '',
          amount: values[headers.indexOf('amount')] || '0',
          type: values[headers.indexOf('type')] || 'expense',
          payee: values[headers.indexOf('payee')] || values[headers.indexOf('description')] || '',
          category: values[headers.indexOf('category')] || '',
          notes: values[headers.indexOf('notes')] || '',
        };
        if (row.date && row.amount) rows.push(row);
      }

      setParsedRows(rows);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedAccount) {
      toast({ title: 'Select an account', description: 'Please select an account to import transactions into.', variant: 'destructive' });
      return;
    }

    setStep('importing');
    let imported = 0;
    let errors = 0;

    for (const row of parsedRows) {
      try {
        const type = row.type.toLowerCase() as 'expense' | 'income' | 'transfer';
        const amount = Math.abs(parseFloat(row.amount));
        if (isNaN(amount) || amount === 0) { errors++; continue; }

        const matchedCategory = categories.find(c =>
          c.name.toLowerCase() === row.category.toLowerCase()
        );

        await createTransaction.mutateAsync({
          date: row.date,
          amount,
          type: ['expense', 'income', 'transfer'].includes(type) ? type : 'expense',
          account_id: selectedAccount,
          category_id: matchedCategory?.id || null,
          payee: row.payee || null,
          notes: row.notes || null,
        });
        imported++;
      } catch {
        errors++;
      }
    }

    setImportedCount(imported);
    setErrorCount(errors);
    setStep('done');
  };

  const handleClose = () => {
    setStep('upload');
    setParsedRows([]);
    setSelectedAccount('');
    setImportedCount(0);
    setErrorCount(0);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const csv = 'date,amount,type,payee,category,notes\n2026-01-15,45.99,expense,Grocery Store,Groceries,Weekly shopping\n2026-01-16,3500,income,Company Inc,Salary,Monthly salary';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finflow-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Transactions
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all"
              >
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-sm">Drop your CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv files with date, amount, type columns</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="gap-1">
                  <Table className="h-3 w-3" />
                  {parsedRows.length} rows found
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                  <X className="h-4 w-4 mr-1" /> Re-upload
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Payee</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                      <th className="text-left p-2 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="p-2 truncate max-w-[80px]">{row.date}</td>
                        <td className="p-2 truncate max-w-[100px]">{row.payee}</td>
                        <td className="p-2 text-right font-medium">{row.amount}</td>
                        <td className="p-2">
                          <Badge variant={row.type === 'income' ? 'default' : 'secondary'} className="text-[10px]">
                            {row.type}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 10 && (
                  <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30">
                    +{parsedRows.length - 10} more rows
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Import into account</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full gap-2 btn-premium" onClick={handleImport} disabled={!selectedAccount}>
                <Upload className="h-4 w-4" />
                Import {parsedRows.length} Transactions
              </Button>
            </motion.div>
          )}

          {step === 'importing' && (
            <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 text-center">
              <div className="h-12 w-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="font-medium">Importing transactions...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-6 text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-income mx-auto" />
              <div>
                <p className="font-bold text-lg">Import Complete!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {importedCount} transactions imported successfully
                </p>
                {errorCount > 0 && (
                  <p className="text-xs text-expense mt-1 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errorCount} rows skipped due to errors
                  </p>
                )}
              </div>
              <Button onClick={handleClose} className="w-full">Done</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
