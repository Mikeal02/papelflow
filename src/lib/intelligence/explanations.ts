/**
 * Shared explanation primitives — every algorithm emits these so the
 * UI can render a transparent, auditable trace of *why* a score was produced.
 */

export interface FeatureContribution {
  name: string;
  value: number | string;
  weight?: number;
  contribution?: number; // signed contribution to final score
  description: string;
}

export interface TransactionEvidence {
  id?: string;
  date: string;
  payee: string;
  amount: number;
  reason: string;
  weight?: number;
}

export interface AlgorithmExplanation {
  algorithm: string;
  summary: string;
  method: string; // e.g. "Modified Z-score with Hampel filter"
  formula?: string;
  features: FeatureContribution[];
  evidence: TransactionEvidence[];
  diagnostics: { label: string; value: string }[];
  confidence: number; // 0-1
}
