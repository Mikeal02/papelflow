import { detectAnomalies, type AnomalyResult } from './anomaly';
import { detectRecurring, type RecurringPattern } from './recurring';
import { forecastCashflow, type CashflowForecast } from './forecast';
import { classifyPersonality, type SpendingPersonality } from './clustering';
import { computeHealthScore, type HealthScore } from './health';
import { TransactionClassifier } from './categorize';
import type { AlgorithmExplanation } from './explanations';

export interface IntelligenceReport {
  anomalies: AnomalyResult[];
  recurring: RecurringPattern[];
  forecast: CashflowForecast;
  personality: SpendingPersonality;
  health: HealthScore;
  classifier: TransactionClassifier;
  explanations: Record<'anomaly' | 'recurring' | 'forecast' | 'personality' | 'health', AlgorithmExplanation>;
  computedAt: number;
  durationMs: number;
}

/**
 * Orchestrates all intelligence subsystems and surfaces per-algorithm explanations.
 * Designed to be cheap (<50ms typical) and run on every transaction change.
 */
export function runIntelligence(
  transactions: any[],
  accounts: any[],
  goals: any[]
): IntelligenceReport {
  const t0 = performance.now();

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  const classifier = new TransactionClassifier();
  classifier.train(transactions);

  const anomaly = detectAnomalies(transactions);
  const recurring = detectRecurring(transactions);
  const forecast = forecastCashflow(transactions, totalBalance, 30, 500);
  const personality = classifyPersonality(transactions);
  const health = computeHealthScore(transactions, accounts, goals);

  const report: IntelligenceReport = {
    anomalies: anomaly.results,
    recurring: recurring.results,
    forecast,
    personality,
    health,
    classifier,
    explanations: {
      anomaly: anomaly.explanation,
      recurring: recurring.explanation,
      forecast: forecast.explanation,
      personality: personality.explanation,
      health: health.explanation,
    },
    computedAt: Date.now(),
    durationMs: 0,
  };
  report.durationMs = Math.round(performance.now() - t0);
  return report;
}
