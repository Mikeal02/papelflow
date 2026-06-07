/**
 * Persisted alert tuning settings. Used by the rules engine sync path and
 * surfaced in the Alert Mission Control panel.
 */
export interface AlertSettings {
  quietHourStart: number;
  quietHourEnd: number;
  maxPerRun: number;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  enabledKinds: Record<string, boolean>;
  soundOnCritical: boolean;
  hapticOnHigh: boolean;
}

export const DEFAULT_SETTINGS: AlertSettings = {
  quietHourStart: 22,
  quietHourEnd: 7,
  maxPerRun: 40,
  minSeverity: 'low',
  enabledKinds: {
    anomaly: true,
    merchant_churn: true,
    merchant_revival: true,
    wallet_concentration: true,
    next_visit: true,
    high_clv_at_risk: true,
  },
  soundOnCritical: true,
  hapticOnHigh: true,
};

const KEY = 'intel:alert-settings:v1';

export function loadAlertSettings(): AlertSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAlertSettings(s: AlertSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  try { window.dispatchEvent(new CustomEvent('intel-alert-settings-changed')); } catch {}
}

const SEV_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
export const meetsMinSeverity = (s: string, min: string) =>
  (SEV_RANK[s] ?? 0) >= (SEV_RANK[min] ?? 0);
