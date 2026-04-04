import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { FinancialPulse } from '@/components/analytics/FinancialPulse';
import { SpendingHeatmap } from '@/components/analytics/SpendingHeatmap';
import { VelocityTracker } from '@/components/analytics/VelocityTracker';
import { AnomalyDetector } from '@/components/analytics/AnomalyDetector';
import { CategoryTreemap } from '@/components/analytics/CategoryTreemap';
import { MerchantIntelligence } from '@/components/analytics/MerchantIntelligence';
import { TimePatternAnalysis } from '@/components/analytics/TimePatternAnalysis';

const Analytics = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center border border-border/30">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Advanced Analytics</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered financial intelligence
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-[10px] font-medium gap-1">
            <Sparkles className="h-3 w-3" />
            Real-time
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-medium gap-1">
            <TrendingUp className="h-3 w-3" />
            ML-Powered
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-medium gap-1">
            <Zap className="h-3 w-3" />
            Live Data
          </Badge>
        </div>
      </motion.div>

      {/* Main Analytics Grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left Column - Key Metrics */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <FinancialPulse />
            <VelocityTracker />
          </div>
          <SpendingHeatmap />
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
        transition={{ delay: 0.3 }}
        className="stat-card text-center py-8"
      >
        <div className="flex h-12 w-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 items-center justify-center border border-border/30">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold">AI Financial Intelligence</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
          Our analytics engine continuously monitors your financial patterns,
          detects anomalies, and provides actionable insights to optimize your spending.
        </p>
      </motion.div>
    </div>
  );
};

export default Analytics;
