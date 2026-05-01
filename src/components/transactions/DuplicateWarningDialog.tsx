import { format } from 'date-fns';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { DuplicateMatch } from '@/lib/duplicate-detection';

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: DuplicateMatch[];
  onConfirm: () => void;
  isProcessing?: boolean;
  /** "edit" | "duplicate" | "create" — controls copy */
  mode?: 'edit' | 'duplicate' | 'create';
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  matches,
  onConfirm,
  isProcessing,
  mode = 'duplicate',
}: DuplicateWarningDialogProps) {
  const { formatCurrency } = useCurrency();
  const count = matches.length;

  const title =
    mode === 'edit'
      ? 'Possible duplicate detected'
      : mode === 'duplicate'
      ? 'This looks like a duplicate'
      : 'Similar transaction exists';

  const description =
    mode === 'edit'
      ? `We found ${count} existing transaction${count > 1 ? 's' : ''} that closely match the changes you're saving.`
      : `We found ${count} existing transaction${count > 1 ? 's' : ''} that closely match what you're about to add.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-warning/15 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-left mt-1">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-2.5 my-2">
          {matches.map(({ transaction: t, score, reasons }) => {
            const Icon =
              t.type === 'income'
                ? ArrowUpRight
                : t.type === 'transfer'
                ? ArrowLeftRight
                : ArrowDownLeft;

            return (
              <div
                key={t.id}
                className="rounded-xl border border-border/40 bg-muted/30 p-3 sm:p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'h-9 w-9 shrink-0 rounded-lg flex items-center justify-center',
                      t.type === 'income' && 'bg-income/15 text-income',
                      t.type === 'expense' && 'bg-expense/15 text-expense',
                      t.type === 'transfer' && 'bg-transfer/15 text-transfer'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">
                        {t.payee || t.category?.name || 'Uncategorized'}
                      </p>
                      <span
                        className={cn(
                          'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
                          score >= 90
                            ? 'bg-destructive/15 text-destructive'
                            : score >= 75
                            ? 'bg-warning/15 text-warning'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {score}% match
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {format(new Date(t.date), 'MMM d, yyyy')} •{' '}
                      {t.account?.name || 'Account'}
                      {t.category?.name ? ` • ${t.category.name}` : ''}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex flex-wrap gap-1">
                        {reasons.slice(0, 3).map((r) => (
                          <span
                            key={r}
                            className="text-[10px] bg-background/70 border border-border/40 px-1.5 py-0.5 rounded text-muted-foreground"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums shrink-0',
                          t.type === 'income' && 'text-income',
                          t.type === 'expense' && 'text-expense',
                          t.type === 'transfer' && 'text-transfer'
                        )}
                      >
                        {formatCurrency(Number(t.amount))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isProcessing}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'edit' ? (
              'Save anyway'
            ) : (
              'Add anyway'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
