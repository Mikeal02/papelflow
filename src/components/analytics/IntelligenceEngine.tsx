import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Repeat, TrendingUp, Sparkles, Heart, Zap, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFinancialIntelligence } from '@/hooks/useFinancialIntelligence';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export const IntelligenceEngine = () => {
  const { report, isLoading } = useFinancialIntelligence();
  const { formatCurrency } = useCurrency();

  if (isLoading || !report) {
    return (
      <div className="stat-card animate-pulse h-72" />
    );
  }

  const { health, anomalies, recurring, forecast, personality, durationMs } = report;

  const severityColor = (s: string) => ({
    extreme: 'text-destructive',
    high: 'text-destructive',
    medium: 'text-warning',
    low: 'text-muted-foreground',
  } as Record<string, string>)[s];

  const trendIcon = forecast.trend === 'improving' ? ArrowUpRight : forecast.trend === 'declining' ? ArrowDownRight : Activity;
  const TrendIcon = trendIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Header strip */}
      <div className="stat-card !p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/15 flex items-center justify-center border border-border/30">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Intelligence Engine</h2>
              <p className="text-xs text-muted-foreground">6 algorithms · {durationMs}ms compute</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" />
            Live
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            icon={Heart}
            label="Health"
            value={`${health.composite}`}
            sub={`Grade ${health.grade}`}
            tone={health.composite >= 70 ? 'success' : health.composite >= 50 ? 'warning' : 'danger'}
          />
          <MetricTile
            icon={TrendIcon}
            label="30d Forecast"
            value={formatCurrency(forecast.endOfMonthBalance)}
            sub={`${forecast.trend} · r²=${forecast.trendStrength.toFixed(2)}`}
            tone={forecast.trend === 'improving' ? 'success' : forecast.trend === 'declining' ? 'danger' : 'neutral'}
          />
          <MetricTile
            icon={Repeat}
            label="Recurring"
            value={`${recurring.length}`}
            sub={`${formatCurrency(recurring.reduce((s, r) => s + r.totalAnnualCost, 0))}/yr`}
            tone="neutral"
          />
          <MetricTile
            icon={AlertTriangle}
            label="Anomalies"
            value={`${anomalies.length}`}
            sub={anomalies.length ? 'Click to review' : 'All clear'}
            tone={anomalies.length ? 'warning' : 'success'}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Health breakdown */}
        <div className="stat-card !p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Multi-dimensional Health
            </h3>
            <Badge variant="outline" className="text-[10px] capitalize">{health.trajectory}</Badge>
          </div>
          <div className="space-y-3">
            {Object.entries(health.dimensions).map(([key, dim]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{Math.round(dim.score)}/100</span>
                </div>
                <Progress value={dim.score} className="h-1.5" />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Zap className="h-3 w-3 inline mr-1 text-primary" />
              {health.topRecommendation}
            </p>
          </div>
        </div>

        {/* Personality */}
        <div className="stat-card !p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-accent" />
            Spending Personality
          </h3>
          <div className="text-center py-4">
            <div className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              {personality.archetype}
            </div>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">{personality.description}</p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {personality.traits.map(t => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-muted-foreground">
              Confidence: {Math.round(personality.confidence * 100)}%
            </div>
          </div>
        </div>

        {/* Anomalies */}
        <div className="stat-card !p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Statistical Anomalies
            <Badge variant="outline" className="text-[10px] ml-auto">MAD z-score</Badge>
          </h3>
          {anomalies.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No anomalies detected. Spending is consistent. ✨</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {anomalies.slice(0, 6).map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">{a.payee}</span>
                      <Badge variant="outline" className={cn('text-[9px]', severityColor(a.severity))}>
                        z={a.zScore}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{a.reason}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <div className="text-xs font-semibold tabular-nums">{formatCurrency(a.amount)}</div>
                    <div className="text-[9px] text-muted-foreground">{format(parseISO(a.date), 'MMM d')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recurring */}
        <div className="stat-card !p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Repeat className="h-4 w-4 text-primary" />
            Auto-detected Recurring
            <Badge variant="outline" className="text-[10px] ml-auto">Fuzzy + autocorr.</Badge>
          </h3>
          {recurring.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No recurring patterns yet — keep logging.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recurring.slice(0, 6).map(r => (
                <div key={r.signature} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate capitalize">{r.payee}</span>
                      <Badge variant="secondary" className="text-[9px] capitalize">{r.cadence}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Next ~{format(parseISO(r.nextPredictedDate), 'MMM d')} · {Math.round(r.confidence * 100)}% conf
                    </p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <div className="text-xs font-semibold tabular-nums">{formatCurrency(r.averageAmount)}</div>
                    <div className="text-[9px] text-muted-foreground tabular-nums">{formatCurrency(r.totalAnnualCost)}/yr</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MetricTile = ({
  icon: Icon, label, value, sub, tone,
}: {
  icon: any; label: string; value: string; sub: string; tone: 'success' | 'warning' | 'danger' | 'neutral';
}) => {
  const toneClass = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    neutral: 'text-foreground',
  }[tone];
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn('h-3.5 w-3.5', toneClass)} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn('text-base font-bold tabular-nums truncate', toneClass)}>{value}</div>
      <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
    </div>
  );
};
