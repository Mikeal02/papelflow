import { detectAnomalies, type AnomalyResult } from './anomaly';
import { detectRecurring, type RecurringPattern } from './recurring';
import { forecastCashflow, type CashflowForecast } from './forecast';
import { classifyPersonality, type SpendingPersonality } from './clustering';
import { computeHealthScore, type HealthScore } from './health';
import { TransactionClassifier } from './categorize';

export interface IntelligenceReport {
  anomalies: AnomalyResult[];
  recurring: RecurringPattern[];
  forecast: CashflowForecast;
  personality: SpendingPersonality;
  health: HealthScore;
  classifier: TransactionClassifier;
  computedAt: number;
  durationMs: number;
}

/**
 * Orchestrates all intelligence subsystems.
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

  const report: IntelligenceReport = {
    anomalies: detectAnomalies(transactions),
    recurring: detectRecurring(transactions),
    forecast: forecastCashflow(transactions, totalBalance, 30, 500),
    personality: classifyPersonality(transactions),
    health: computeHealthScore(transactions, accounts, goals),
    classifier,
    computedAt: Date.now(),
    durationMs: 0,
  };
  report.durationMs = Math.round(performance.now() - t0);
  return report;
}
