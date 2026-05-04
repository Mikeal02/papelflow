import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Repeat, TrendingUp, Sparkles, Heart, Zap, ArrowUpRight, ArrowDownRight, Activity, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useFinancialIntelligence } from '@/hooks/useFinancialIntelligence';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlgorithmExplanationDrawer } from './AlgorithmExplanationDrawer';
import type { AlgorithmExplanation } from '@/lib/intelligence/explanations';

type ExplKey = 'health' | 'forecast' | 'recurring' | 'anomaly' | 'personality';

export const IntelligenceEngine = () => {
  const { report, isLoading } = useFinancialIntelligence();
  const { formatCurrency } = useCurrency();
  const [activeExpl, setActiveExpl] = useState<AlgorithmExplanation | null>(null);

  if (isLoading || !report) {
    return <div className="stat-card animate-pulse h-72" />;
  }

  const { health, anomalies, recurring, forecast, personality, durationMs, explanations } = report;
  const openExpl = (k: ExplKey) => setActiveExpl(explanations[k]);

  const severityColor = (s: string) => ({
    extreme: 'text-destructive',
    high: 'text-destructive',
    medium: 'text-warning',
    low: 'text-muted-foreground',
  } as Record<string, string>)[s];

  const trendIcon = forecast.trend === 'improving' ? ArrowUpRight : forecast.trend === 'declining' ? ArrowDownRight : Activity;
  const TrendIcon = trendIcon;

  return (
    <>
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
                <p className="text-xs text-muted-foreground">5 algorithms · {durationMs}ms compute · click any tile for full trace</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Sparkles className="h-3 w-3" />
              Live
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile
              icon={Heart} label="Health" value={`${health.composite}`} sub={`Grade ${health.grade}`}
              tone={health.composite >= 70 ? 'success' : health.composite >= 50 ? 'warning' : 'danger'}
              onClick={() => openExpl('health')}
            />
            <MetricTile
              icon={TrendIcon} label="30d Forecast" value={formatCurrency(forecast.endOfMonthBalance)}
              sub={`${forecast.trend} · r²=${forecast.trendStrength.toFixed(2)}`}
              tone={forecast.trend === 'improving' ? 'success' : forecast.trend === 'declining' ? 'danger' : 'neutral'}
              onClick={() => openExpl('forecast')}
            />
            <MetricTile
              icon={Repeat} label="Recurring" value={`${recurring.length}`}
              sub={`${formatCurrency(recurring.reduce((s, r) => s + r.totalAnnualCost, 0))}/yr`}
              tone="neutral"
              onClick={() => openExpl('recurring')}
            />
            <MetricTile
              icon={AlertTriangle} label="Anomalies" value={`${anomalies.length}`}
              sub={anomalies.length ? 'Click to inspect' : 'All clear'}
              tone={anomalies.length ? 'warning' : 'success'}
              onClick={() => openExpl('anomaly')}
            />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Health breakdown */}
          <div className="stat-card !p-5">
            <PanelHeader icon={Heart} title="Multi-dimensional Health" badge={health.trajectory} onWhy={() => openExpl('health')} />
            <div className="space-y-3">
              {Object.entries(health.dimensions).map(([key, dim]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{Math.round(dim.score)}/100 · w{dim.weight.toFixed(2)}</span>
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
            <PanelHeader icon={Sparkles} title="Spending Personality" onWhy={() => openExpl('personality')} />
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
            <PanelHeader icon={AlertTriangle} title="Statistical Anomalies" badge="MAD z-score" onWhy={() => openExpl('anomaly')} />
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
            <PanelHeader icon={Repeat} title="Auto-detected Recurring" badge="Fuzzy + autocorr." onWhy={() => openExpl('recurring')} />
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

      <AlgorithmExplanationDrawer
        open={!!activeExpl}
        onOpenChange={(v) => !v && setActiveExpl(null)}
        explanation={activeExpl}
      />
    </>
  );
};

const PanelHeader = ({ icon: Icon, title, badge, onWhy }: { icon: any; title: string; badge?: string; onWhy: () => void }) => (
  <div className="flex items-center justify-between mb-4 gap-2">
    <h3 className="text-sm font-semibold flex items-center gap-2 min-w-0">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <span className="truncate">{title}</span>
    </h3>
    <div className="flex items-center gap-1.5 shrink-0">
      {badge && <Badge variant="outline" className="text-[10px] capitalize">{badge}</Badge>}
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={onWhy}>
        <Info className="h-3 w-3" />
        Why?
      </Button>
    </div>
  </div>
);

const MetricTile = ({
  icon: Icon, label, value, sub, tone, onClick,
}: {
  icon: any; label: string; value: string; sub: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; onClick?: () => void;
}) => {
  const toneClass = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    neutral: 'text-foreground',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-border/30 bg-card/50 p-3 hover:border-primary/40 hover:bg-card/80 transition-colors group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('h-3.5 w-3.5', toneClass)} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <Info className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>
      <div className={cn('text-base font-bold tabular-nums truncate', toneClass)}>{value}</div>
      <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
    </button>
  );
};
