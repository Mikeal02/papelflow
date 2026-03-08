import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingUp, Clock, Store, Zap, X, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdvancedAnalytics, SpendingAnomaly } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';

const anomalyIcons = {
  spike: TrendingUp,
  unusual_time: Clock,
  new_merchant: Store,
  category_surge: Zap,
  velocity: AlertTriangle,
};

const severityStyles = {
  high: 'border-expense/50 bg-expense/5',
  medium: 'border-warning/50 bg-warning/5',
  low: 'border-primary/50 bg-primary/5',
};

const severityIconStyles = {
  high: 'bg-expense/20 text-expense',
  medium: 'bg-warning/20 text-warning',
  low: 'bg-primary/20 text-primary',
};

export const AnomalyDetector = () => {
  const { anomalies } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAnomalies = anomalies.filter(a => !dismissed.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  if (visibleAnomalies.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="stat-card">
          <CardContent className="py-8 text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-16 w-16 mx-auto mb-4 rounded-full bg-income/10 flex items-center justify-center"
            >
              <ShieldAlert className="h-8 w-8 text-income" />
            </motion.div>
            <h3 className="font-semibold text-lg">All Clear!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No spending anomalies detected. Your finances look healthy.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="stat-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              Anomaly Detection
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {visibleAnomalies.length} alert{visibleAnomalies.length !== 1 && 's'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <AnimatePresence mode="popLayout">
            {visibleAnomalies.map((anomaly, index) => {
              const Icon = anomalyIcons[anomaly.type];
              
              return (
                <motion.div
                  key={anomaly.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-3 rounded-xl border flex items-start gap-3 group relative',
                    severityStyles[anomaly.severity]
                  )}
                >
                  {/* Severity indicator pulse */}
                  {anomaly.severity === 'high' && (
                    <motion.div
                      className="absolute top-3 left-3 h-10 w-10 rounded-lg bg-expense/30"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 relative z-10', severityIconStyles[anomaly.severity])}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">{anomaly.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {anomaly.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDismiss(anomaly.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {anomaly.amount && (
                        <span className="font-bold text-foreground">
                          {formatCurrency(anomaly.amount)}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {format(parseISO(anomaly.date), 'MMM d')}
                      </span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium capitalize',
                        anomaly.severity === 'high' && 'bg-expense/20 text-expense',
                        anomaly.severity === 'medium' && 'bg-warning/20 text-warning',
                        anomaly.severity === 'low' && 'bg-primary/20 text-primary'
                      )}>
                        {anomaly.severity}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {dismissed.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setDismissed(new Set())}
            >
              Show dismissed ({dismissed.size})
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
