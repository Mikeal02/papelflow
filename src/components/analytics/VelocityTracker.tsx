import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gauge, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle, Zap, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { GradientBadge } from '@/components/ui/glowing-border';

export const VelocityTracker = () => {
  const { velocityMetrics } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();

  const trendConfig = {
    accelerating: { icon: TrendingUp, color: 'text-expense', label: 'Accelerating', desc: 'Spending is rising' },
    stable: { icon: Minus, color: 'text-primary', label: 'Stable', desc: 'On track' },
    decelerating: { icon: TrendingDown, color: 'text-income', label: 'Decelerating', desc: 'Spending is dropping' },
  };

  const trend = trendConfig[velocityMetrics.velocityTrend];
  const velocityRatio = velocityMetrics.averageVelocity > 0
    ? (velocityMetrics.currentVelocity / velocityMetrics.averageVelocity) * 100
    : 100;

  const gaugePercent = Math.min(Math.max(velocityRatio / 200, 0), 1);
  const isHigh = velocityRatio > 120;
  const isLow = velocityRatio < 80;

  // Generate tick marks for the arc gauge
  const ticks = useMemo(() => {
    const count = 24;
    return Array.from({ length: count + 1 }, (_, i) => {
      const angle = -135 + (i / count) * 270;
      const rad = (angle * Math.PI) / 180;
      const r1 = 76;
      const r2 = i % 6 === 0 ? 66 : 70;
      return {
        x1: 100 + r1 * Math.cos(rad),
        y1: 100 + r1 * Math.sin(rad),
        x2: 100 + r2 * Math.cos(rad),
        y2: 100 + r2 * Math.sin(rad),
        isMajor: i % 6 === 0,
      };
    });
  }, []);

  // Arc path helper
  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = ((startAngle - 90) * Math.PI) / 180;
    const end = ((endAngle - 90) * Math.PI) / 180;
    const sx = cx + r * Math.cos(start);
    const sy = cy + r * Math.sin(start);
    const ex = cx + r * Math.cos(end);
    const ey = cy + r * Math.sin(end);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
  };

  const bgArc = describeArc(100, 100, 78, -135, 135);
  const fillAngle = -135 + gaugePercent * 270;
  const fillArc = gaugePercent > 0.01 ? describeArc(100, 100, 78, -135, fillAngle) : '';

  // Needle angle
  const needleAngle = -135 + gaugePercent * 270;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="stat-card overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
                <Gauge className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span>Spending Velocity</span>
                <p className="text-[10px] text-muted-foreground font-normal">{trend.desc}</p>
              </div>
            </CardTitle>
            <GradientBadge variant={velocityMetrics.velocityTrend === 'decelerating' ? 'success' : velocityMetrics.velocityTrend === 'stable' ? 'primary' : 'warning'}>
              <trend.icon className="h-3 w-3" />
              {trend.label}
            </GradientBadge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Elite Gauge */}
          <div className="relative flex items-center justify-center py-2">
            <svg viewBox="0 0 200 160" className="w-full max-w-[240px]">
              <defs>
                <linearGradient id="velGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--income))" />
                  <stop offset="40%" stopColor="hsl(var(--primary))" />
                  <stop offset="70%" stopColor="hsl(var(--warning))" />
                  <stop offset="100%" stopColor="hsl(var(--expense))" />
                </linearGradient>
                <filter id="velGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="needleGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Tick marks */}
              {ticks.map((t, i) => (
                <line
                  key={i}
                  x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={t.isMajor ? 1.5 : 0.5}
                  strokeOpacity={t.isMajor ? 0.5 : 0.25}
                  strokeLinecap="round"
                />
              ))}

              {/* Background arc */}
              <path d={bgArc} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" strokeLinecap="round" />

              {/* Filled arc */}
              {fillArc && (
                <motion.path
                  d={fillArc}
                  fill="none"
                  stroke="url(#velGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  filter="url(#velGlow)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              )}

              {/* Needle glow */}
              <circle cx="100" cy="100" r="18" fill="url(#needleGlow)" />

              {/* Needle */}
              <motion.g
                initial={{ rotate: -135 }}
                animate={{ rotate: needleAngle }}
                transition={{ type: 'spring', stiffness: 40, damping: 12 }}
                style={{ transformOrigin: '100px 100px' }}
              >
                <line
                  x1="100" y1="100" x2="100" y2="38"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="38" r="3" fill={isHigh ? 'hsl(var(--expense))' : isLow ? 'hsl(var(--income))' : 'hsl(var(--primary))'} />
              </motion.g>

              {/* Center hub */}
              <circle cx="100" cy="100" r="6" fill="hsl(var(--foreground))" />
              <circle cx="100" cy="100" r="3" fill="hsl(var(--background))" />

              {/* Scale labels */}
              <text x="28" y="145" className="text-[9px] fill-muted-foreground" textAnchor="middle">0</text>
              <text x="100" y="22" className="text-[9px] fill-muted-foreground" textAnchor="middle">Avg</text>
              <text x="172" y="145" className="text-[9px] fill-muted-foreground" textAnchor="middle">2×</text>
            </svg>

            {/* Center value overlay */}
            <div className="absolute bottom-0 left-0 right-0 text-center">
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                isHigh && 'text-expense',
                isLow && 'text-income',
                !isHigh && !isLow && 'text-foreground'
              )}>
                {formatCurrency(velocityMetrics.currentVelocity)}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">per day</p>
            </div>
          </div>

          {/* Velocity ratio bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">Velocity Index</span>
              <span className={cn(
                'font-bold tabular-nums',
                isHigh && 'text-expense',
                isLow && 'text-income',
                !isHigh && !isLow && 'text-foreground'
              )}>
                {velocityRatio.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
              {/* Average marker */}
              <div className="absolute top-0 bottom-0 w-px bg-foreground/30 z-10" style={{ left: '50%' }} />
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: isHigh
                    ? 'linear-gradient(90deg, hsl(var(--warning)), hsl(var(--expense)))'
                    : isLow
                      ? 'linear-gradient(90deg, hsl(var(--income)), hsl(var(--primary)))'
                      : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(gaugePercent * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>0%</span>
              <span>100% avg</span>
              <span>200%</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <Activity className="h-3.5 w-3.5 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground mb-0.5">Avg Rate</p>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(velocityMetrics.averageVelocity)}</p>
              <p className="text-[9px] text-muted-foreground">per day</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <Zap className="h-3.5 w-3.5 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground mb-0.5">Projected</p>
              <p className={cn(
                'text-sm font-bold tabular-nums',
                velocityMetrics.projectedMonthEnd > velocityMetrics.averageVelocity * 30 ? 'text-expense' : 'text-income'
              )}>
                {formatCurrency(velocityMetrics.projectedMonthEnd)}
              </p>
              <p className="text-[9px] text-muted-foreground">this month</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <TrendingUp className="h-3.5 w-3.5 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground mb-0.5">Variance</p>
              <p className={cn(
                'text-sm font-bold tabular-nums',
                velocityRatio > 100 ? 'text-expense' : 'text-income'
              )}>
                {velocityRatio > 100 ? '+' : ''}{(velocityRatio - 100).toFixed(0)}%
              </p>
              <p className="text-[9px] text-muted-foreground">vs average</p>
            </div>
          </div>

          {/* Budget exhaustion warning */}
          {velocityMetrics.daysUntilBudgetExhausted !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'p-3.5 rounded-xl flex items-center gap-3 border',
                velocityMetrics.daysUntilBudgetExhausted <= 7
                  ? 'bg-expense/5 border-expense/20'
                  : 'bg-warning/5 border-warning/20'
              )}
            >
              <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                velocityMetrics.daysUntilBudgetExhausted <= 7 ? 'bg-expense/15' : 'bg-warning/15'
              )}>
                {velocityMetrics.daysUntilBudgetExhausted <= 7 ? (
                  <AlertTriangle className="h-5 w-5 text-expense" />
                ) : (
                  <Clock className="h-5 w-5 text-warning" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {velocityMetrics.daysUntilBudgetExhausted <= 7
                    ? 'Budget running low!'
                    : 'Budget projection'}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{velocityMetrics.daysUntilBudgetExhausted} days</span> until budget exhausted at current rate
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
