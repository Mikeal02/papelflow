import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, Zap } from 'lucide-react';

import { PageTransition } from '@/components/layout/PageTransition';
import { FinancialPulse } from '@/components/analytics/FinancialPulse';
import { SpendingHeatmap } from '@/components/analytics/SpendingHeatmap';
import { VelocityTracker } from '@/components/analytics/VelocityTracker';
import { AnomalyDetector } from '@/components/analytics/AnomalyDetector';
import { CategoryTreemap } from '@/components/analytics/CategoryTreemap';
import { MerchantIntelligence } from '@/components/analytics/MerchantIntelligence';
import { TimePatternAnalysis } from '@/components/analytics/TimePatternAnalysis';
import { AuroraBackground, MorphingBlob } from '@/components/ui/aurora-background';
import { GradientBadge } from '@/components/ui/glowing-border';

const Analytics = () => {
  return (
    <>
      <PageTransition>
        <div className="space-y-6 relative">
          {/* Ambient background effects */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <MorphingBlob color="hsl(var(--primary))" size={400} className="-top-40 -left-40" />
            <MorphingBlob color="hsl(var(--accent))" size={300} className="-bottom-20 -right-20" />
          </div>

          {/* Header */}
          <AuroraBackground variant="default" intensity="low" className="rounded-2xl p-6 border border-border/50">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-accent to-chart-6 flex items-center justify-center text-white shadow-lg"
                  >
                    <Brain className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">
                      <span className="holographic">Advanced Analytics</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      AI-powered financial intelligence
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <GradientBadge variant="premium">
                  <Sparkles className="h-3 w-3" />
                  Real-time
                </GradientBadge>
                <GradientBadge variant="success">
                  <TrendingUp className="h-3 w-3" />
                  ML-Powered
                </GradientBadge>
                <GradientBadge variant="primary">
                  <Zap className="h-3 w-3" />
                  Live Data
                </GradientBadge>
              </div>
            </motion.div>
          </AuroraBackground>

          {/* Main Analytics Grid */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Left Column - Key Metrics */}
            <div className="lg:col-span-2 space-y-5">
              {/* Top row - Pulse and Velocity */}
              <div className="grid gap-5 md:grid-cols-2">
                <FinancialPulse />
                <VelocityTracker />
              </div>

              {/* Heatmap */}
              <SpendingHeatmap />

              {/* Pattern Analysis */}
              <TimePatternAnalysis />
            </div>

            {/* Right Column - Insights */}
            <div className="space-y-5">
              <AnomalyDetector />
              <CategoryTreemap />
              <MerchantIntelligence />
            </div>
          </div>

          {/* AI Insights Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-primary/10 via-accent/10 to-chart-6/10 border border-border/50"
          >
            <div className="absolute inset-0 particles opacity-20" />
            
            <div className="relative z-10 text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
              >
                <Brain className="h-7 w-7 text-white" />
              </motion.div>
              <h3 className="text-lg font-bold gradient-text">AI Financial Intelligence</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Our advanced analytics engine continuously monitors your financial patterns,
                detects anomalies, and provides actionable insights to optimize your spending.
              </p>
            </div>
          </motion.div>
        </div>
      </PageTransition>
    </>
  );
};

export default Analytics;
