import { lazy } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/layout/PageTransition';
import { Deferred, WidgetPlaceholder } from '@/components/ui/deferred';

/**
 * Every panel here is code-split and viewport-gated. The Scenario Lab alone
 * runs thousands of Monte Carlo trajectories on mount, and Spending DNA plus
 * the anomaly/merchant consoles each run their own heavy pipelines — mounting
 * them all eagerly blocked the main thread for seconds on page entry.
 */
const IntelligenceEngine = lazy(() => import('@/components/analytics/IntelligenceEngine').then(m => ({ default: m.IntelligenceEngine })));
const FinancialPulse = lazy(() => import('@/components/analytics/FinancialPulse').then(m => ({ default: m.FinancialPulse })));
const SpendingHeatmap = lazy(() => import('@/components/analytics/SpendingHeatmap').then(m => ({ default: m.SpendingHeatmap })));
const VelocityTracker = lazy(() => import('@/components/analytics/VelocityTracker').then(m => ({ default: m.VelocityTracker })));
const AnomalyDetector = lazy(() => import('@/components/analytics/AnomalyDetector').then(m => ({ default: m.AnomalyDetector })));
const CategoryTreemap = lazy(() => import('@/components/analytics/CategoryTreemap').then(m => ({ default: m.CategoryTreemap })));
const MerchantIntelligence = lazy(() => import('@/components/analytics/MerchantIntelligence').then(m => ({ default: m.MerchantIntelligence })));
const TimePatternAnalysis = lazy(() => import('@/components/analytics/TimePatternAnalysis').then(m => ({ default: m.TimePatternAnalysis })));
const ScenarioLab = lazy(() => import('@/components/analytics/ScenarioLab').then(m => ({ default: m.ScenarioLab })));
const SpendingDNA = lazy(() => import('@/components/analytics/SpendingDNA').then(m => ({ default: m.SpendingDNA })));
const IntelligenceAlerts = lazy(() => import('@/components/analytics/IntelligenceAlerts').then(m => ({ default: m.IntelligenceAlerts })));

const Analytics = () => {
  return (
    <PageTransition>
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

        {/* Intelligence Engine — composite algorithmic layer, above the fold */}
        <Deferred eager fallback={<WidgetPlaceholder height="h-72" />}>
          <IntelligenceEngine />
        </Deferred>

        {/* Elite simulation features — heavy, load on approach */}
        <Deferred fallback={<WidgetPlaceholder height="h-96" />}>
          <ScenarioLab />
        </Deferred>
        <Deferred fallback={<WidgetPlaceholder height="h-96" />}>
          <SpendingDNA />
        </Deferred>

        {/* Main Analytics Grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left Column - Key Metrics */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Deferred fallback={<WidgetPlaceholder height="h-64" />}><FinancialPulse /></Deferred>
              <Deferred fallback={<WidgetPlaceholder height="h-64" />}><VelocityTracker /></Deferred>
            </div>
            <Deferred fallback={<WidgetPlaceholder height="h-72" />}><SpendingHeatmap /></Deferred>
            <Deferred fallback={<WidgetPlaceholder height="h-72" />}><TimePatternAnalysis /></Deferred>
          </div>

          {/* Right Column - Insights */}
          <div className="space-y-5">
            <Deferred fallback={<WidgetPlaceholder height="h-72" />}><IntelligenceAlerts /></Deferred>
            <Deferred fallback={<WidgetPlaceholder height="h-72" />}><AnomalyDetector /></Deferred>
            <Deferred fallback={<WidgetPlaceholder height="h-64" />}><CategoryTreemap /></Deferred>
            <Deferred fallback={<WidgetPlaceholder height="h-72" />}><MerchantIntelligence /></Deferred>
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
    </PageTransition>
  );
};

export default Analytics;
