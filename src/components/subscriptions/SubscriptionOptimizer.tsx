import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingDown, AlertCircle, CheckCircle2, DollarSign, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscriptions, useUpdateSubscription } from '@/hooks/useSubscriptions';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Recommendation {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  type: 'unused' | 'downgrade' | 'switch-annual' | 'duplicate';
  title: string;
  description: string;
  potentialSaving: number;
  confidence: 'high' | 'medium' | 'low';
}

export const SubscriptionOptimizer = () => {
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();
  const updateSubscription = useUpdateSubscription();
  const [aiTips, setAiTips] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const recommendations = useMemo(() => {
    const result: Recommendation[] = [];
    const active = subscriptions.filter(s => s.is_active);

    active.forEach(sub => {
      // Check for potentially unused (no related transactions in last 30 days)
      const relatedTx = transactions.filter(t => {
        const daysDiff = differenceInDays(new Date(), new Date(t.date));
        return daysDiff <= 90 && (
          t.payee?.toLowerCase().includes(sub.name.toLowerCase()) ||
          t.notes?.toLowerCase().includes(sub.name.toLowerCase())
        );
      });

      if (relatedTx.length === 0 && Number(sub.amount) > 5) {
        result.push({
          id: `unused-${sub.id}`,
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          type: 'unused',
          title: `Consider canceling ${sub.name}`,
          description: `No activity detected in the last 90 days. You could save ${formatCurrency(Number(sub.amount))}/${sub.frequency}.`,
          potentialSaving: Number(sub.amount),
          confidence: 'medium',
        });
      }

      // Annual switch recommendation
      if (sub.frequency === 'monthly' && Number(sub.amount) > 10) {
        const annualSaving = Number(sub.amount) * 12 * 0.17; // Typical 17% annual discount
        result.push({
          id: `annual-${sub.id}`,
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          type: 'switch-annual',
          title: `Switch ${sub.name} to annual`,
          description: `Save ~${formatCurrency(annualSaving)}/year by switching to annual billing.`,
          potentialSaving: annualSaving / 12,
          confidence: 'low',
        });
      }
    });

    // Check for potential duplicates (same category, similar amounts)
    const byCategory: Record<string, typeof active> = {};
    active.forEach(s => {
      const key = s.category_id || 'uncategorized';
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(s);
    });

    Object.values(byCategory).forEach(group => {
      if (group.length >= 2) {
        const names = group.map(s => s.name).join(' & ');
        const cheapest = Math.min(...group.map(s => Number(s.amount)));
        result.push({
          id: `dup-${group[0].id}`,
          subscriptionId: group[0].id,
          subscriptionName: names,
          type: 'duplicate',
          title: `Potential overlap: ${names}`,
          description: `You have ${group.length} subscriptions in the same category. Consider consolidating.`,
          potentialSaving: cheapest,
          confidence: 'low',
        });
      }
    });

    return result.sort((a, b) => b.potentialSaving - a.potentialSaving);
  }, [subscriptions, transactions, formatCurrency]);

  const totalPotentialSaving = recommendations.reduce((s, r) => s + r.potentialSaving, 0);

  const handlePauseSubscription = async (subId: string) => {
    await updateSubscription.mutateAsync({ id: subId, is_active: false });
    toast({ title: 'Subscription paused' });
  };

  const getAiOptimization = async () => {
    setAiLoading(true);
    try {
      const subList = subscriptions
        .filter(s => s.is_active)
        .map(s => `${s.name}: ${formatCurrency(Number(s.amount))}/${s.frequency}`)
        .join('\n');

      const response = await supabase.functions.invoke('financial-advisor', {
        body: {
          messages: [{ role: 'user', content: `Analyze these subscriptions and give 3 specific cost-saving tips:\n${subList}` }],
          financialContext: { budgetStatus: `${subscriptions.length} active subscriptions, ${formatCurrency(totalPotentialSaving)}/mo potential savings` },
        },
      });

      if (response.error) throw response.error;

      // Read streaming response
      const reader = response.data?.getReader?.();
      if (reader) {
        const decoder = new TextDecoder();
        let text = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (json === '[DONE]') continue;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) text += content;
            } catch {}
          }
        }
        setAiTips(text);
      }
    } catch (error) {
      console.error('AI optimization error:', error);
      toast({ title: 'Could not get AI tips', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  if (recommendations.length === 0 && !aiTips) return null;

  return (
    <Card className="stat-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            Subscription Optimizer
          </CardTitle>
          {totalPotentialSaving > 0 && (
            <Badge className="badge-premium text-xs">
              Save up to {formatCurrency(totalPotentialSaving)}/mo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.slice(0, 4).map((rec, i) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'rounded-xl border p-3 flex items-start gap-3',
              rec.type === 'unused' ? 'border-warning/30 bg-warning/5' :
              rec.type === 'duplicate' ? 'border-expense/30 bg-expense/5' :
              'border-primary/30 bg-primary/5'
            )}
          >
            <div className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
              rec.type === 'unused' ? 'bg-warning/10 text-warning' :
              rec.type === 'duplicate' ? 'bg-expense/10 text-expense' :
              'bg-primary/10 text-primary'
            )}>
              {rec.type === 'unused' ? <AlertCircle className="h-4 w-4" /> :
               rec.type === 'duplicate' ? <TrendingDown className="h-4 w-4" /> :
               <DollarSign className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold">{rec.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">{rec.description}</p>
              {rec.type === 'unused' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-[10px]"
                  onClick={() => handlePauseSubscription(rec.subscriptionId)}
                >
                  Pause Subscription
                </Button>
              )}
            </div>
          </motion.div>
        ))}

        {/* AI Tips */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={getAiOptimization}
          disabled={aiLoading}
        >
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Get AI Optimization Tips
        </Button>

        {aiTips && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-muted/50 p-3"
          >
            <p className="text-xs whitespace-pre-wrap leading-relaxed">{aiTips}</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
