import { motion } from 'framer-motion';
import { Gauge, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { GradientBadge } from '@/components/ui/glowing-border';

export const VelocityTracker = () => {
  const { velocityMetrics } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();

  const trendConfig = {
    accelerating: { icon: TrendingUp, color: 'text-expense', label: 'Accelerating' },
    stable: { icon: Minus, color: 'text-primary', label: 'Stable' },
    decelerating: { icon: TrendingDown, color: 'text-income', label: 'Decelerating' },
  };

  const trend = trendConfig[velocityMetrics.velocityTrend];
  const velocityRatio = velocityMetrics.averageVelocity > 0 
    ? (velocityMetrics.currentVelocity / velocityMetrics.averageVelocity) * 100 
    : 100;

  // Gauge angle calculation (-45 to 225 degrees)
  const gaugeAngle = Math.min(Math.max((velocityRatio / 200) * 270 - 45, -45), 225);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="stat-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Spending Velocity
            </CardTitle>
            <GradientBadge variant={velocityMetrics.velocityTrend === 'decelerating' ? 'success' : velocityMetrics.velocityTrend === 'stable' ? 'primary' : 'warning'}>
              <trend.icon className="h-3 w-3" />
              {trend.label}
            </GradientBadge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Speedometer gauge */}
          <div className="relative h-32 flex items-center justify-center">
            <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
              {/* Background arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
                strokeLinecap="round"
              />
              
              {/* Gradient arc */}
              <defs>
                <linearGradient id="velocityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--income))" />
                  <stop offset="50%" stopColor="hsl(var(--warning))" />
                  <stop offset="100%" stopColor="hsl(var(--expense))" />
                </linearGradient>
              </defs>
              
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#velocityGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(velocityRatio / 200) * 251.2} 251.2`}
              />

              {/* Needle */}
              <motion.g
                initial={{ rotate: -45 }}
                animate={{ rotate: gaugeAngle }}
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                style={{ transformOrigin: '100px 100px' }}
              >
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="35"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="100" r="8" fill="hsl(var(--foreground))" />
              </motion.g>

              {/* Labels */}
              <text x="20" y="115" className="text-[10px] fill-muted-foreground" textAnchor="middle">0</text>
              <text x="100" y="25" className="text-[10px] fill-muted-foreground" textAnchor="middle">Avg</text>
              <text x="180" y="115" className="text-[10px] fill-muted-foreground" textAnchor="middle">2x</text>
            </svg>

            {/* Center value */}
            <div className="absolute bottom-2 text-center">
              <p className="text-2xl font-bold">{formatCurrency(velocityMetrics.currentVelocity)}</p>
              <p className="text-xs text-muted-foreground">per day</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Average Velocity</p>
              <p className="text-lg font-bold">{formatCurrency(velocityMetrics.averageVelocity)}/day</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Month Projection</p>
              <p className={cn(
                'text-lg font-bold',
                velocityMetrics.projectedMonthEnd > velocityMetrics.averageVelocity * 30 ? 'text-expense' : 'text-income'
              )}>
                {formatCurrency(velocityMetrics.projectedMonthEnd)}
              </p>
            </div>
          </div>

          {/* Budget exhaustion warning */}
          {velocityMetrics.daysUntilBudgetExhausted !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'mt-3 p-3 rounded-xl flex items-center gap-3',
                velocityMetrics.daysUntilBudgetExhausted <= 7 ? 'bg-expense/10' : 'bg-warning/10'
              )}
            >
              <div className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center',
                velocityMetrics.daysUntilBudgetExhausted <= 7 ? 'bg-expense/20' : 'bg-warning/20'
              )}>
                {velocityMetrics.daysUntilBudgetExhausted <= 7 ? (
                  <AlertTriangle className="h-5 w-5 text-expense" />
                ) : (
                  <Clock className="h-5 w-5 text-warning" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {velocityMetrics.daysUntilBudgetExhausted <= 7 
                    ? 'Budget running low!' 
                    : 'Budget projection'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {velocityMetrics.daysUntilBudgetExhausted} days until budget exhausted at current rate
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
