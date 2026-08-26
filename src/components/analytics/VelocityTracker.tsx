import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertTriangle,
  Zap,
  Activity,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { GradientBadge } from '@/components/ui/glowing-border';

export const VelocityTracker = () => {
  const { velocityMetrics } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();

  /*
   * ---------------------------------------------------------
   * Normalize / sanitize the analytics data
   * ---------------------------------------------------------
   */

  const currentVelocity = Number(velocityMetrics?.currentVelocity) || 0;
  const averageVelocity = Number(velocityMetrics?.averageVelocity) || 0;
  const projectedMonthEnd =
    Number(velocityMetrics?.projectedMonthEnd) || 0;

  const rawDaysUntilBudgetExhausted =
    velocityMetrics?.daysUntilBudgetExhausted;

  const daysUntilBudgetExhausted =
    rawDaysUntilBudgetExhausted === null ||
    rawDaysUntilBudgetExhausted === undefined
      ? null
      : Number(rawDaysUntilBudgetExhausted);

  /*
   * ---------------------------------------------------------
   * Trend
   * ---------------------------------------------------------
   */

  const trendConfig = {
    accelerating: {
      icon: TrendingUp,
      color: 'text-expense',
      label: 'Accelerating',
      desc: 'Spending is rising',
      badge: 'warning' as const,
    },

    stable: {
      icon: Minus,
      color: 'text-primary',
      label: 'Stable',
      desc: 'On track',
      badge: 'primary' as const,
    },

    decelerating: {
      icon: TrendingDown,
      color: 'text-income',
      label: 'Decelerating',
      desc: 'Spending is dropping',
      badge: 'success' as const,
    },
  };

  const trend =
    trendConfig[
      velocityMetrics?.velocityTrend as keyof typeof trendConfig
    ] ?? trendConfig.stable;

  const TrendIcon = trend.icon;

  /*
   * ---------------------------------------------------------
   * Velocity ratio
   *
   * 100% = average spending velocity
   * 200% = twice the average
   * 50%  = half the average
   * ---------------------------------------------------------
   */

  const velocityRatio =
    averageVelocity > 0
      ? (currentVelocity / averageVelocity) * 100
      : 100;

  const safeVelocityRatio = Number.isFinite(velocityRatio)
  ? Math.min(Math.max(velocityRatio, 0), 200)
  : 100;

  /*
   * Gauge only displays 0% -> 200%.
   *
   * Example:
   * 0%   = far left
   * 100% = center / average
   * 200% = far right
   */

  const gaugePercent = safeVelocityRatio/200;

  const isHigh = safeVelocityRatio > 120;
  const isLow = safeVelocityRatio < 80;

  /*
   * ---------------------------------------------------------
   * SVG GAUGE
   *
   * We use ONE angle system everywhere:
   *
   * 0°   = top
   * 90°  = right
   * 180° = bottom
   * 270° = left
   *
   * Gauge:
   * -135° -> left/bottom
   *  135° -> right/bottom
   *
   * This keeps ticks, arc and needle perfectly aligned.
   * ---------------------------------------------------------
   */

  const CENTER_X = 100;
  const CENTER_Y = 100;
  const RADIUS = 78;

  const START_ANGLE = -135;
  const END_ANGLE = 135;

  const polarToCartesian = (
    cx: number,
    cy: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians =
      ((angleInDegrees - 90) * Math.PI) / 180;

    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(
      cx,
      cy,
      radius,
      endAngle
    );

    const end = polarToCartesian(
      cx,
      cy,
      radius,
      startAngle
    );

    const angleDifference = endAngle - startAngle;

    const largeArcFlag = angleDifference <= 180 ? '0' : '1';

    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    ].join(' ');
  };

  const bgArc = useMemo(
    () =>
      describeArc(
        CENTER_X,
        CENTER_Y,
        RADIUS,
        START_ANGLE,
        END_ANGLE
      ),
    []
  );

  /*
   * ---------------------------------------------------------
   * TICKS
   * ---------------------------------------------------------
   */

  const ticks = useMemo(() => {
    const count = 24;

    return Array.from({ length: count + 1 }, (_, i) => {
      const angle =
        START_ANGLE +
        (i / count) * (END_ANGLE - START_ANGLE);

      const outer = polarToCartesian(
        CENTER_X,
        CENTER_Y,
        86,
        angle
      );

      const inner = polarToCartesian(
        CENTER_X,
        CENTER_Y,
        i % 6 === 0 ? 73 : 77,
        angle
      );

      return {
        x1: outer.x,
        y1: outer.y,
        x2: inner.x,
        y2: inner.y,
        isMajor: i % 6 === 0,
      };
    });
  }, []);

  /*
   * ---------------------------------------------------------
   * NEEDLE
   * ---------------------------------------------------------
   */

  const needleAngle =
  START_ANGLE +
  gaugePercent * (END_ANGLE - START_ANGLE);

const NEEDLE_LENGTH = 62;

const needlePoint = polarToCartesian(
  CENTER_X,
  CENTER_Y,
  NEEDLE_LENGTH,
  needleAngle
);

  const needleColor = isHigh
    ? 'hsl(var(--expense))'
    : isLow
      ? 'hsl(var(--income))'
      : 'hsl(var(--primary))';

  /*
   * ---------------------------------------------------------
   * Gauge progress
   *
   * Instead of dynamically changing the path itself,
   * use a fixed arc + strokeDasharray.
   *
   * This gives much smoother Framer Motion animation.
   * ---------------------------------------------------------
   */

  const ARC_LENGTH = Math.PI * RADIUS * 1.5;

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
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

                <p className="text-[10px] text-muted-foreground font-normal">
                  {trend.desc}
                </p>
              </div>
            </CardTitle>

            <GradientBadge variant={trend.badge}>
              <TrendIcon className="h-3 w-3" />
              {trend.label}
            </GradientBadge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* =====================================================
              GAUGE
              ===================================================== */}

          <div className="relative flex items-center justify-center py-2">
            <svg
              viewBox="0 0 200 160"
              className="w-full max-w-[240px]"
              aria-label={`Spending velocity ${safeVelocityRatio.toFixed(
                0
              )}% of average`}
            >
              <defs>
                <linearGradient
                  id="velocityGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--income))"
                  />

                  <stop
                    offset="40%"
                    stopColor="hsl(var(--primary))"
                  />

                  <stop
                    offset="70%"
                    stopColor="hsl(var(--warning))"
                  />

                  <stop
                    offset="100%"
                    stopColor="hsl(var(--expense))"
                  />
                </linearGradient>

                <filter
                  id="velocityGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur
                    stdDeviation="3"
                    result="blur"
                  />

                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <radialGradient
                  id="needleGlow"
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--foreground))"
                    stopOpacity="0.3"
                  />

                  <stop
                    offset="100%"
                    stopColor="hsl(var(--foreground))"
                    stopOpacity="0"
                  />
                </radialGradient>
              </defs>

              {/* =========================
                  Tick marks
                  ========================= */}

              {ticks.map((tick, index) => (
                <line
                  key={index}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={tick.isMajor ? 1.5 : 0.5}
                  strokeOpacity={tick.isMajor ? 0.5 : 0.25}
                  strokeLinecap="round"
                />
              ))}

              {/* =========================
                  Background arc
                  ========================= */}

              <path
                d={bgArc}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="10"
                strokeLinecap="round"
              />

              {/* =========================
                  Filled arc
                  ========================= */}

              <motion.path
                d={bgArc}
                fill="none"
                stroke="url(#velocityGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                filter="url(#velocityGlow)"
                pathLength={1}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: gaugePercent }}
                transition={{
                  duration: 1,
                  ease: 'easeOut',
                }}
              />

              {/* =========================
                  Needle glow
                  ========================= */}

              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r="20"
                fill="url(#needleGlow)"
              />

              {/* =========================
                  Needle
                  ========================= */}

              <motion.line
  x1={CENTER_X}
  y1={CENTER_Y}
  x2={needlePoint.x}
  y2={needlePoint.y}
  stroke="hsl(var(--foreground))"
  strokeWidth="2.5"
  strokeLinecap="round"
  initial={{
    x2: polarToCartesian(
      CENTER_X,
      CENTER_Y,
      NEEDLE_LENGTH,
      START_ANGLE
    ).x,
    y2: polarToCartesian(
      CENTER_X,
      CENTER_Y,
      NEEDLE_LENGTH,
      START_ANGLE
    ).y,
  }}
  animate={{
    x2: needlePoint.x,
    y2: needlePoint.y,
  }}
  transition={{
    type: 'spring',
    stiffness: 70,
    damping: 14,
  }}
/>

<motion.circle
  r="3.5"
  fill={needleColor}
  initial={{
    cx: polarToCartesian(
      CENTER_X,
      CENTER_Y,
      NEEDLE_LENGTH,
      START_ANGLE
    ).x,
    cy: polarToCartesian(
      CENTER_X,
      CENTER_Y,
      NEEDLE_LENGTH,
      START_ANGLE
    ).y,
  }}
  animate={{
    cx: needlePoint.x,
    cy: needlePoint.y,
  }}
  transition={{
    type: 'spring',
    stiffness: 70,
    damping: 14,
  }}
/>

              {/* =========================
                  Center hub
                  ========================= */}

              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r="7"
                fill="hsl(var(--foreground))"
              />

              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r="3"
                fill="hsl(var(--background))"
              />

              {/* =========================
                  Labels
                  ========================= */}

              <text
                x="28"
                y="145"
                className="text-[9px] fill-muted-foreground"
                textAnchor="middle"
              >
                0
              </text>

              <text
                x="100"
                y="20"
                className="text-[9px] fill-muted-foreground"
                textAnchor="middle"
              >
                Avg
              </text>

              <text
                x="172"
                y="145"
                className="text-[9px] fill-muted-foreground"
                textAnchor="middle"
              >
                2×
              </text>
            </svg>

            {/* Center value */}

            <div className="absolute bottom-0 left-0 right-0 text-center">
              <p
                className={cn(
                  'text-2xl font-bold tabular-nums',
                  isHigh && 'text-expense',
                  isLow && 'text-income',
                  !isHigh &&
                    !isLow &&
                    'text-foreground'
                )}
              >
                {formatCurrency(currentVelocity)}
              </p>

              <p className="text-[10px] text-muted-foreground font-medium">
                per day
              </p>
            </div>
          </div>

          {/* =====================================================
              VELOCITY INDEX
              ===================================================== */}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">
                Velocity Index
              </span>

              <span
                className={cn(
                  'font-bold tabular-nums',
                  isHigh && 'text-expense',
                  isLow && 'text-income',
                  !isHigh &&
                    !isLow &&
                    'text-foreground'
                )}
              >
                {safeVelocityRatio.toFixed(0)}%
              </span>
            </div>

            <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
              {/* Average marker */}

              <div
                className="absolute top-0 bottom-0 w-px bg-foreground/30 z-10"
                style={{ left: '50%' }}
              />

              {/* Progress */}

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
                animate={{
                  width: `${gaugePercent * 100}%`,
                }}
                transition={{
                  duration: 0.8,
                  ease: 'easeOut',
                }}
              />
            </div>

            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>0%</span>
              <span>100% avg</span>
              <span>200%</span>
            </div>
          </div>

          {/* =====================================================
              STATS
              ===================================================== */}

          <div className="grid grid-cols-3 gap-2">
            {/* Average */}

            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <Activity className="h-3.5 w-3.5 mx-auto mb-1.5 text-muted-foreground" />

              <p className="text-[10px] text-muted-foreground mb-0.5">
                Avg Rate
              </p>

              <p className="text-sm font-bold tabular-nums">
                {formatCurrency(averageVelocity)}
              </p>

              <p className="text-[9px] text-muted-foreground">
                per day
              </p>
            </div>

            {/* Projected */}

            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <Zap className="h-3.5 w-3.5 mx-auto mb-1.5 text-muted-foreground" />

              <p className="text-[10px] text-muted-foreground mb-0.5">
                Projected
              </p>

              <p
                className={cn(
                  'text-sm font-bold tabular-nums',
                  averageVelocity > 0 &&
                    projectedMonthEnd >
                      averageVelocity * 30
                    ? 'text-expense'
                    : 'text-income'
                )}
              >
                {formatCurrency(projectedMonthEnd)}
              </p>

              <p className="text-[9px] text-muted-foreground">
                this month
              </p>
            </div>

            {/* Variance */}

            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <TrendingUp className="h-3.5 w-3.5 mx-auto mb-1.5 text-muted-foreground" />

              <p className="text-[10px] text-muted-foreground mb-0.5">
                Variance
              </p>

              <p
                className={cn(
                  'text-sm font-bold tabular-nums',
                  safeVelocityRatio > 100
                    ? 'text-expense'
                    : safeVelocityRatio < 100
                      ? 'text-income'
                      : 'text-foreground'
                )}
              >
                {safeVelocityRatio > 100 ? '+' : ''}
                {(safeVelocityRatio - 100).toFixed(0)}%
              </p>

              <p className="text-[9px] text-muted-foreground">
                vs average
              </p>
            </div>
          </div>

          {/* =====================================================
              BUDGET WARNING
              ===================================================== */}

          {daysUntilBudgetExhausted !== null &&
            Number.isFinite(daysUntilBudgetExhausted) &&
            daysUntilBudgetExhausted >= 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-3.5 rounded-xl flex items-center gap-3 border',
                  daysUntilBudgetExhausted <= 7
                    ? 'bg-expense/5 border-expense/20'
                    : 'bg-warning/5 border-warning/20'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    daysUntilBudgetExhausted <= 7
                      ? 'bg-expense/15'
                      : 'bg-warning/15'
                  )}
                >
                  {daysUntilBudgetExhausted <= 7 ? (
                    <AlertTriangle className="h-5 w-5 text-expense" />
                  ) : (
                    <Clock className="h-5 w-5 text-warning" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {daysUntilBudgetExhausted <= 7
                      ? 'Budget running low!'
                      : 'Budget projection'}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {Math.round(daysUntilBudgetExhausted)} days
                    </span>{' '}
                    until budget exhausted at current rate
                  </p>
                </div>
              </motion.div>
            )}
        </CardContent>
      </Card>
    </motion.div>
  );
};