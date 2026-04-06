import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileJson, FileSpreadsheet, Download, Check, Database, ArrowRight,
  BarChart3, Wallet, Target, CreditCard, Tag, CalendarDays, Loader2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ExportDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    profile: any;
    accounts: any[];
    transactions: any[];
    budgets: any[];
    categories: any[];
    goals: any[];
    subscriptions: any[];
  };
}

type ExportFormat = 'json' | 'csv';

interface DataModule {
  key: string;
  label: string;
  icon: React.ElementType;
  count: number;
  color: string;
}

export function ExportDataModal({ open, onOpenChange, data }: ExportDataModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(['transactions', 'accounts', 'budgets', 'categories', 'goals', 'subscriptions'])
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const modules: DataModule[] = useMemo(() => [
    { key: 'transactions', label: 'Transactions', icon: BarChart3, count: data.transactions.length, color: 'text-primary' },
    { key: 'accounts', label: 'Accounts', icon: Wallet, count: data.accounts.length, color: 'text-income' },
    { key: 'budgets', label: 'Budgets', icon: CreditCard, count: data.budgets.length, color: 'text-accent' },
    { key: 'categories', label: 'Categories', icon: Tag, count: data.categories.length, color: 'text-chart-3' },
    { key: 'goals', label: 'Goals', icon: Target, count: data.goals.length, color: 'text-chart-4' },
    { key: 'subscriptions', label: 'Subscriptions', icon: CalendarDays, count: data.subscriptions.length, color: 'text-chart-5' },
  ], [data]);

  const totalRecords = useMemo(() =>
    modules.filter(m => selectedModules.has(m.key)).reduce((s, m) => s + m.count, 0),
    [modules, selectedModules]
  );

  const toggleModule = (key: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedModules.size === modules.length) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(modules.map(m => m.key)));
    }
  };

  const estimateSize = useMemo(() => {
    const selected: Record<string, any[]> = {};
    modules.filter(m => selectedModules.has(m.key)).forEach(m => {
      selected[m.key] = (data as any)[m.key] || [];
    });
    const jsonStr = JSON.stringify(selected);
    const bytes = new Blob([jsonStr]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [modules, selectedModules, data]);

  const handleExport = async () => {
    if (selectedModules.size === 0) {
      toast({ title: 'No data selected', description: 'Please select at least one data category to export.', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    // Small delay for UX feel
    await new Promise(r => setTimeout(r, 600));

    const dateStr = format(new Date(), 'yyyy-MM-dd');

    if (selectedFormat === 'json') {
      const exportPayload: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        format: 'PapelFlow Export v1',
        profile: data.profile,
      };
      modules.filter(m => selectedModules.has(m.key)).forEach(m => {
        exportPayload[m.key] = (data as any)[m.key];
      });

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `papelflow-export-${dateStr}.json`);
    } else {
      // Rich CSV with multiple sections
      let csv = '';

      if (selectedModules.has('transactions')) {
        csv += '# TRANSACTIONS\n';
        csv += 'Date,Type,Amount,Payee,Category,Account,Notes,Tags\n';
        data.transactions.forEach(t => {
          const cat = t.category?.name || '';
          const acc = t.account?.name || '';
          const tags = t.tags?.join('; ') || '';
          csv += [t.date, t.type, t.amount, t.payee || '', cat, acc, t.notes || '', tags]
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',') + '\n';
        });
        csv += '\n';
      }

      if (selectedModules.has('accounts')) {
        csv += '# ACCOUNTS\n';
        csv += 'Name,Type,Balance,Currency,Notes\n';
        data.accounts.forEach(a => {
          csv += [a.name, a.type, a.balance, a.currency || 'USD', a.notes || '']
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',') + '\n';
        });
        csv += '\n';
      }

      if (selectedModules.has('budgets')) {
        csv += '# BUDGETS\n';
        csv += 'Month,Category ID,Amount,Rollover\n';
        data.budgets.forEach(b => {
          csv += [b.month, b.category_id, b.amount, b.rollover ? 'Yes' : 'No']
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',') + '\n';
        });
        csv += '\n';
      }

      if (selectedModules.has('categories')) {
        csv += '# CATEGORIES\n';
        csv += 'Name,Type,Color,Group,Budget Amount\n';
        data.categories.forEach(c => {
          csv += [c.name, c.type, c.color || '', c.category_group || '', c.budget_amount || 0]
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',') + '\n';
        });
        csv += '\n';
      }

      if (selectedModules.has('goals')) {
        csv += '# GOALS\n';
        csv += 'Name,Target,Current,Deadline\n';
        data.goals.forEach(g => {
          csv += [g.name, g.target_amount, g.current_amount || 0, g.deadline || '']
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',') + '\n';
        });
        csv += '\n';
      }

      if (selectedModules.has('subscriptions')) {
        csv += '# SUBSCRIPTIONS\n';
        csv += 'Name,Amount,Frequency,Next Due,Active\n';
        data.subscriptions.forEach(s => {
          csv += [s.name, s.amount, s.frequency, s.next_due, s.is_active ? 'Yes' : 'No']
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',') + '\n';
        });
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `papelflow-export-${dateStr}.csv`);
    }

    setIsExporting(false);
    setExported(true);
    toast({ title: 'Export complete', description: `${totalRecords} records exported as ${selectedFormat.toUpperCase()}` });
    setTimeout(() => { setExported(false); onOpenChange(false); }, 1500);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isExporting) { setExported(false); onOpenChange(v); } }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {exported ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 px-6"
            >
              <div className="h-16 w-16 rounded-2xl bg-income/10 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-income" />
              </div>
              <h3 className="text-lg font-semibold">Export Complete</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {totalRecords} records • {estimateSize} • {selectedFormat.toUpperCase()}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-2.5 text-lg">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Download className="h-4.5 w-4.5 text-primary" />
                  </div>
                  Export Your Data
                </DialogTitle>
                <DialogDescription>
                  Choose a format and select which data to include in your export.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-5">
                {/* Format selector */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">Format</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'json' as ExportFormat, icon: FileJson, label: 'JSON', desc: 'Full structured data' },
                      { key: 'csv' as ExportFormat, icon: FileSpreadsheet, label: 'CSV', desc: 'Spreadsheet compatible' },
                    ]).map(f => (
                      <button
                        key={f.key}
                        onClick={() => setSelectedFormat(f.key)}
                        className={cn(
                          'relative flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left',
                          selectedFormat === f.key
                            ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                        )}
                      >
                        <f.icon className={cn('h-5 w-5', selectedFormat === f.key ? 'text-primary' : 'text-muted-foreground')} />
                        <div>
                          <p className="text-sm font-medium">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                        </div>
                        {selectedFormat === f.key && (
                          <motion.div
                            layoutId="format-check"
                            className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="bg-border/30" />

                {/* Data modules */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data to Include</p>
                    <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                      {selectedModules.size === modules.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {modules.map(m => (
                      <button
                        key={m.key}
                        onClick={() => toggleModule(m.key)}
                        className={cn(
                          'flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left',
                          selectedModules.has(m.key)
                            ? 'border-border/60 bg-muted/30'
                            : 'border-border/20 bg-transparent opacity-50'
                        )}
                      >
                        <Checkbox
                          checked={selectedModules.has(m.key)}
                          onCheckedChange={() => toggleModule(m.key)}
                          className="pointer-events-none"
                        />
                        <m.icon className={cn('h-4 w-4', m.color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{m.label}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] tabular-nums shrink-0">
                          {m.count}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary bar */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    <span className="tabular-nums font-medium">{totalRecords}</span> records
                    <span className="text-border/60">•</span>
                    <span className="tabular-nums">~{estimateSize}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{selectedFormat}</Badge>
                </div>

                {/* Export button */}
                <Button
                  onClick={handleExport}
                  disabled={isExporting || selectedModules.size === 0}
                  className="w-full btn-premium h-11 gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing export…
                    </>
                  ) : (
                    <>
                      Export {selectedFormat.toUpperCase()}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
