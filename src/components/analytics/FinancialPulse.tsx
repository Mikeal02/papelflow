import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Heart, Zap, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { cn } from '@/lib/utils';
import { ReactiveParticles } from '@/components/ui/aurora-background';

export const FinancialPulse = () => {
  const { financialPulse, velocityMetrics, anomalies } = useAdvancedAnalytics();

  const statusConfig = {
    excellent: { color: 'text-income', bg: 'bg-income/10', glow: 'hsl(var(--income))' },
    good: { color: 'text-primary', bg: 'bg-primary/10', glow: 'hsl(var(--primary))' },
    fair: { color: 'text-warning', bg: 'bg-warning/10', glow: 'hsl(var(--warning))' },
    critical: { color: 'text-expense', bg: 'bg-expense/10', glow: 'hsl(var(--expense))' },
  };

  const config = statusConfig[financialPulse.status];
  const pulseSpeed = financialPulse.status === 'critical' ? 0.5 : 
                     financialPulse.status === 'fair' ? 0.8 : 1.2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <Card className="stat-card overflow-hidden">
        {/* Reactive particles based on health */}
        <ReactiveParticles 
          intensity={financialPulse.value} 
          color={config.glow}
          count={20}
        />

        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className={cn('h-4 w-4', config.color)} />
            Financial Pulse
          </CardTitle>
        </CardHeader>

        <CardContent className="relative z-10">
          <div className="flex items-center gap-6">
            {/* Heartbeat visualization */}
            <div className="relative">
              <motion.div
                className={cn('h-24 w-24 rounded-full flex items-center justify-center', config.bg)}
                animate={{
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    `0 0 0 0 ${config.glow}`,
                    `0 0 30px 10px ${config.glow}40`,
                    `0 0 0 0 ${config.glow}`,
                  ],
                }}
                transition={{
                  duration: pulseSpeed,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Heart className={cn('h-10 w-10', config.color)} />
              </motion.div>
              
              {/* Pulse value */}
              <motion.div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card border shadow-lg"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className={cn('text-lg font-bold', config.color)}>
                  {financialPulse.value.toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </motion.div>
            </div>

            {/* Metrics */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Savings Rate</span>
                <span className={cn('text-sm font-bold', financialPulse.savingsRate >= 20 ? 'text-income' : 'text-warning')}>
                  {financialPulse.savingsRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Budget Score</span>
                <span className={cn('text-sm font-bold', financialPulse.budgetAdherence >= 80 ? 'text-income' : 'text-warning')}>
                  {financialPulse.budgetAdherence.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Goal Progress</span>
                <span className="text-sm font-bold text-primary">
                  {financialPulse.goalProgress.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* ECG Line */}
          <div className="mt-4 h-12 relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
              <motion.path
                d="M0,20 L30,20 L35,20 L40,5 L45,35 L50,20 L55,20 L80,20 L85,20 L90,5 L95,35 L100,20 L105,20 L130,20 L135,20 L140,5 L145,35 L150,20 L155,20 L200,20"
                fill="none"
                stroke={config.glow}
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </svg>
            <div 
              className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-card to-transparent"
            />
          </div>

          {/* Status message */}
          <motion.div
            className={cn('mt-3 p-2 rounded-lg text-center text-sm', config.bg)}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className={cn('font-medium capitalize', config.color)}>
              {financialPulse.status}
            </span>
            <span className="text-muted-foreground ml-1">
              {financialPulse.status === 'excellent' && '- Keep up the amazing work!' }
              {financialPulse.status === 'good' && '- You\'re on the right track' }
              {financialPulse.status === 'fair' && '- Some areas need attention' }
              {financialPulse.status === 'critical' && '- Immediate action recommended' }
            </span>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
