import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sigma, FileCode2, ListChecks, Receipt, Gauge } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AlgorithmExplanation } from '@/lib/intelligence/explanations';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  explanation: AlgorithmExplanation | null;
}

/**
 * Transparent algorithm trace: shows method, formula, contributing features,
 * and the top transactions that pushed the score where it landed.
 */
export const AlgorithmExplanationDrawer = ({ open, onOpenChange, explanation }: Props) => {
  const { formatCurrency } = useCurrency();
  if (!explanation) return null;

  const maxContribution = Math.max(
    1e-9,
    ...explanation.features.map(f => Math.abs(f.contribution ?? 0))
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sigma className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">{explanation.algorithm}</SheetTitle>
              <p className="text-[11px] text-muted-foreground">{explanation.method}</p>
            </div>
          </div>
          <SheetDescription className="leading-relaxed text-foreground/80">
            {explanation.summary}
          </SheetDescription>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Gauge className="h-3 w-3" />
              Confidence {Math.round(explanation.confidence * 100)}%
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {explanation.formula && (
            <section>
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileCode2 className="h-3 w-3" />
                Formula
              </h4>
              <pre className="text-[11px] font-mono bg-muted/40 border border-border/40 rounded-lg p-3 whitespace-pre-wrap break-words">
                {explanation.formula}
              </pre>
            </section>
          )}

          <section>
            <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <ListChecks className="h-3 w-3" />
              Contributing features
            </h4>
            <div className="space-y-2.5">
              {explanation.features.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No feature contributions surfaced.</p>
              )}
              {explanation.features.map((f, i) => {
                const contrib = Math.abs(f.contribution ?? 0);
                const pct = (contrib / maxContribution) * 100;
                return (
                  <div key={i} className="rounded-lg border border-border/40 bg-card/50 p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium truncate">{f.name}</span>
                      <span className="text-xs font-semibold tabular-nums">{f.value}</span>
                    </div>
                    {f.contribution !== undefined && (
                      <Progress value={pct} className="h-1 mb-1.5" />
                    )}
                    <p className="text-[10.5px] text-muted-foreground leading-snug">{f.description}</p>
                    {(f.weight !== undefined || f.contribution !== undefined) && (
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground tabular-nums">
                        {f.weight !== undefined && <span>weight {f.weight.toFixed(2)}</span>}
                        {f.contribution !== undefined && <span>contrib {f.contribution.toFixed(2)}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {explanation.evidence.length > 0 && (
            <section>
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Receipt className="h-3 w-3" />
                Top contributing transactions
              </h4>
              <div className="space-y-2">
                {explanation.evidence.map((e, i) => (
                  <div key={(e.id || '') + i} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{e.payee}</span>
                        {e.weight !== undefined && (
                          <Badge variant="outline" className={cn(
                            'text-[9px]',
                            e.weight > 0.7 ? 'border-destructive/40 text-destructive' :
                            e.weight > 0.4 ? 'border-warning/40 text-warning' :
                            'border-border'
                          )}>
                            {Math.round(e.weight * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{e.reason}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold tabular-nums">{formatCurrency(e.amount)}</div>
                      <div className="text-[9px] text-muted-foreground">{format(parseISO(e.date), 'MMM d')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {explanation.diagnostics.length > 0 && (
            <section>
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Diagnostics</h4>
              <div className="grid grid-cols-2 gap-2">
                {explanation.diagnostics.map((d, i) => (
                  <div key={i} className="rounded-lg bg-muted/30 border border-border/30 p-2">
                    <div className="text-[10px] text-muted-foreground">{d.label}</div>
                    <div className="text-xs font-semibold tabular-nums truncate">{d.value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
