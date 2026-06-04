/**
 * Scenario Lab — Multi-variable Monte Carlo wealth simulator.
 *
 * Models ~5,000 stochastic 60-month trajectories combining:
 *  - Income growth (deterministic) + monthly income shock (lognormal)
 *  - Expense inflation (CPI) + behavioral spend shock (gaussian)
 *  - Investment return (geometric brownian motion with μ, σ)
 *  - Recurring contribution stream (compounded monthly)
 *  - Discrete black-swan events sampled via Poisson process
 *  - Tax drag on positive returns
 *
 * Returns full distributional summary (p5/p25/p50/p75/p95), success probability
 * for a wealth target, expected shortfall, and a basket of stress tests.
 */

export interface ScenarioInputs {
  startingNetWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyContribution: number;
  horizonMonths: number;          // 12..480
  iterations: number;             // 500..10000
  incomeGrowthAnnual: number;     // e.g., 0.04
  inflationAnnual: number;        // e.g., 0.03
  expectedReturnAnnual: number;   // e.g., 0.07
  returnVolatilityAnnual: number; // e.g., 0.15
  taxRateOnReturns: number;       // e.g., 0.20
  blackSwanAnnualProb: number;    // e.g., 0.05
  blackSwanMagnitude: number;     // e.g., 0.25  (fractional NW loss)
  wealthTarget: number;
  incomeShockSigma: number;       // monthly relative stdev, e.g., 0.05
  expenseShockSigma: number;      // monthly relative stdev, e.g., 0.07
}

export interface ScenarioBand {
  month: number;
  p5: number; p25: number; p50: number; p75: number; p95: number;
}

export interface ScenarioStressTest {
  name: string;
  delta: number;          // change vs base p50 endpoint
  endpointP50: number;
  successProb: number;
  description: string;
}

export interface ScenarioReport {
  bands: ScenarioBand[];
  endpointP5: number;
  endpointP25: number;
  endpointP50: number;
  endpointP75: number;
  endpointP95: number;
  successProbability: number;   // P(final >= target)
  expectedShortfall: number;    // E[final | final < target]
  worstCase: number;            // p1
  bestCase: number;             // p99
  maxDrawdownMedian: number;    // typical max drawdown across runs
  ruinProbability: number;      // P(any month NW < 0)
  yearsToTarget: number | null; // median
  sharpeProxy: number;          // (μ-rf)/σ on annualized terminal returns
  stressTests: ScenarioStressTest[];
  iterations: number;
  durationMs: number;
}

function gauss(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function runSimulation(p: ScenarioInputs): {
  trajectories: Float32Array[];
  finals: number[];
  maxDrawdowns: number[];
  ruinHits: number;
  monthsToTarget: number[];
} {
  const monthlyReturn = p.expectedReturnAnnual / 12;
  const monthlyVol = p.returnVolatilityAnnual / Math.sqrt(12);
  const monthlyIncomeGrowth = Math.pow(1 + p.incomeGrowthAnnual, 1 / 12) - 1;
  const monthlyInflation = Math.pow(1 + p.inflationAnnual, 1 / 12) - 1;
  const monthlyBlackSwan = p.blackSwanAnnualProb / 12;

  const trajectories: Float32Array[] = [];
  const finals: number[] = [];
  const maxDrawdowns: number[] = [];
  const monthsToTarget: number[] = [];
  let ruinHits = 0;

  for (let it = 0; it < p.iterations; it++) {
    const path = new Float32Array(p.horizonMonths + 1);
    let nw = p.startingNetWorth;
    let inc = p.monthlyIncome;
    let exp = p.monthlyExpenses;
    let contrib = p.monthlyContribution;
    let peak = nw;
    let maxDD = 0;
    let hitTarget = -1;
    let ruined = false;
    path[0] = nw;

    for (let m = 1; m <= p.horizonMonths; m++) {
      // Income + expense drift
      inc *= 1 + monthlyIncomeGrowth;
      exp *= 1 + monthlyInflation;
      contrib *= 1 + monthlyIncomeGrowth;

      // Stochastic income/expense shocks (multiplicative, mean ~ 1)
      const incThisMonth = inc * Math.exp(p.incomeShockSigma * gauss() - p.incomeShockSigma ** 2 / 2);
      const expThisMonth = exp * Math.exp(p.expenseShockSigma * gauss() - p.expenseShockSigma ** 2 / 2);

      const netSavings = (incThisMonth - expThisMonth) + contrib;

      // Investment return (GBM)
      const r = monthlyReturn + monthlyVol * gauss();
      let investmentPnl = nw * r;
      if (investmentPnl > 0) investmentPnl *= 1 - p.taxRateOnReturns;

      nw += netSavings + investmentPnl;

      // Black swan
      if (Math.random() < monthlyBlackSwan) {
        nw *= 1 - p.blackSwanMagnitude;
      }

      if (nw > peak) peak = nw;
      const dd = peak > 0 ? (peak - nw) / peak : 0;
      if (dd > maxDD) maxDD = dd;
      if (nw < 0 && !ruined) ruined = true;
      if (hitTarget < 0 && nw >= p.wealthTarget) hitTarget = m;

      path[m] = nw;
    }

    trajectories.push(path);
    finals.push(nw);
    maxDrawdowns.push(maxDD);
    if (ruined) ruinHits++;
    if (hitTarget > 0) monthsToTarget.push(hitTarget);
  }

  return { trajectories, finals, maxDrawdowns, ruinHits, monthsToTarget };
}

function summarize(p: ScenarioInputs, sim: ReturnType<typeof runSimulation>): Omit<ScenarioReport, 'stressTests' | 'durationMs'> {
  const N = sim.finals.length;
  const sortedFinals = [...sim.finals].sort((a, b) => a - b);
  const sortedDD = [...sim.maxDrawdowns].sort((a, b) => a - b);

  // Bands per month: sample up to 60 anchor months for performance.
  const horizon = p.horizonMonths;
  const anchorEvery = Math.max(1, Math.floor(horizon / 60));
  const bands: ScenarioBand[] = [];
  for (let m = 0; m <= horizon; m += anchorEvery) {
    const slice = sim.trajectories.map(t => t[m]).sort((a, b) => a - b);
    bands.push({
      month: m,
      p5: percentile(slice, 0.05),
      p25: percentile(slice, 0.25),
      p50: percentile(slice, 0.5),
      p75: percentile(slice, 0.75),
      p95: percentile(slice, 0.95),
    });
  }
  // Always include last month
  if (bands[bands.length - 1].month !== horizon) {
    const slice = sim.trajectories.map(t => t[horizon]).sort((a, b) => a - b);
    bands.push({
      month: horizon,
      p5: percentile(slice, 0.05),
      p25: percentile(slice, 0.25),
      p50: percentile(slice, 0.5),
      p75: percentile(slice, 0.75),
      p95: percentile(slice, 0.95),
    });
  }

  const successProbability = sim.finals.filter(v => v >= p.wealthTarget).length / N;
  const shortfalls = sim.finals.filter(v => v < p.wealthTarget);
  const expectedShortfall = shortfalls.length
    ? shortfalls.reduce((a, b) => a + b, 0) / shortfalls.length
    : 0;

  const yearsToTarget = sim.monthsToTarget.length
    ? percentile([...sim.monthsToTarget].sort((a, b) => a - b), 0.5) / 12
    : null;

  // Sharpe proxy on terminal CAGR
  const years = p.horizonMonths / 12;
  const cagrs = sim.finals.map(v => {
    if (p.startingNetWorth <= 0 || v <= 0) return -1;
    return Math.pow(v / p.startingNetWorth, 1 / years) - 1;
  });
  const meanCagr = cagrs.reduce((a, b) => a + b, 0) / cagrs.length;
  const variance = cagrs.reduce((a, b) => a + (b - meanCagr) ** 2, 0) / Math.max(1, cagrs.length - 1);
  const sd = Math.sqrt(variance);
  const sharpeProxy = sd === 0 ? 0 : (meanCagr - 0.02) / sd;

  return {
    bands,
    endpointP5: percentile(sortedFinals, 0.05),
    endpointP25: percentile(sortedFinals, 0.25),
    endpointP50: percentile(sortedFinals, 0.5),
    endpointP75: percentile(sortedFinals, 0.75),
    endpointP95: percentile(sortedFinals, 0.95),
    worstCase: percentile(sortedFinals, 0.01),
    bestCase: percentile(sortedFinals, 0.99),
    successProbability,
    expectedShortfall,
    maxDrawdownMedian: percentile(sortedDD, 0.5),
    ruinProbability: sim.ruinHits / N,
    yearsToTarget,
    sharpeProxy,
    iterations: N,
  };
}

const STRESS_SCENARIOS: { name: string; description: string; mutate: (p: ScenarioInputs) => ScenarioInputs }[] = [
  { name: 'Recession', description: '-30% returns, +200bps inflation, doubled swan probability for 2y', mutate: p => ({ ...p, expectedReturnAnnual: p.expectedReturnAnnual - 0.05, inflationAnnual: p.inflationAnnual + 0.02, blackSwanAnnualProb: p.blackSwanAnnualProb * 2 }) },
  { name: 'Job Loss',   description: '50% income for 12 months (modeled as halved monthly income)', mutate: p => ({ ...p, monthlyIncome: p.monthlyIncome * 0.5, monthlyContribution: p.monthlyContribution * 0.5 }) },
  { name: 'Stagflation',description: 'Inflation +400bps, returns -300bps', mutate: p => ({ ...p, inflationAnnual: p.inflationAnnual + 0.04, expectedReturnAnnual: p.expectedReturnAnnual - 0.03 }) },
  { name: 'Bull Market',description: 'Returns +400bps, lower vol, low swan risk', mutate: p => ({ ...p, expectedReturnAnnual: p.expectedReturnAnnual + 0.04, returnVolatilityAnnual: Math.max(0.05, p.returnVolatilityAnnual - 0.03), blackSwanAnnualProb: p.blackSwanAnnualProb * 0.5 }) },
  { name: 'Lifestyle Inflation', description: '+25% expenses, contributions halved', mutate: p => ({ ...p, monthlyExpenses: p.monthlyExpenses * 1.25, monthlyContribution: p.monthlyContribution * 0.5 }) },
  { name: 'Aggressive Saver', description: 'Contributions +50%, expenses -10%', mutate: p => ({ ...p, monthlyContribution: p.monthlyContribution * 1.5, monthlyExpenses: p.monthlyExpenses * 0.9 }) },
];

export function runScenarioLab(inputs: ScenarioInputs): ScenarioReport {
  const t0 = performance.now();
  const base = runSimulation(inputs);
  const baseSummary = summarize(inputs, base);

  // Run lighter stress tests (~25% iterations)
  const stressIter = Math.max(200, Math.floor(inputs.iterations * 0.25));
  const stressTests: ScenarioStressTest[] = STRESS_SCENARIOS.map(s => {
    const mutated = { ...s.mutate(inputs), iterations: stressIter };
    const sim = runSimulation(mutated);
    const sortedF = [...sim.finals].sort((a, b) => a - b);
    const endpointP50 = percentile(sortedF, 0.5);
    const successProb = sim.finals.filter(v => v >= inputs.wealthTarget).length / sim.finals.length;
    return {
      name: s.name,
      description: s.description,
      endpointP50,
      successProb,
      delta: endpointP50 - baseSummary.endpointP50,
    };
  });

  return {
    ...baseSummary,
    stressTests,
    durationMs: Math.round(performance.now() - t0),
  };
}

export const DEFAULT_SCENARIO_INPUTS: ScenarioInputs = {
  startingNetWorth: 25000,
  monthlyIncome: 6500,
  monthlyExpenses: 4200,
  monthlyContribution: 800,
  horizonMonths: 240,
  iterations: 2000,
  incomeGrowthAnnual: 0.04,
  inflationAnnual: 0.03,
  expectedReturnAnnual: 0.07,
  returnVolatilityAnnual: 0.15,
  taxRateOnReturns: 0.2,
  blackSwanAnnualProb: 0.05,
  blackSwanMagnitude: 0.25,
  wealthTarget: 500000,
  incomeShockSigma: 0.05,
  expenseShockSigma: 0.07,
};

/* =====================================================================
 * ELITE EXTENSIONS — sensitivity, optimizer, decumulation, sequence risk,
 * glide path, raw path sampling.
 * ===================================================================*/

export interface SensitivityResult {
  parameter: keyof ScenarioInputs;
  label: string;
  baseValue: number;
  lowValue: number;
  highValue: number;
  lowEndpointP50: number;
  highEndpointP50: number;
  lowSuccess: number;
  highSuccess: number;
  elasticity: number;
  swing: number;
}

const SENSITIVITY_PARAMS: { key: keyof ScenarioInputs; label: string; delta: number }[] = [
  { key: 'expectedReturnAnnual',   label: 'Expected Return',        delta: 0.2 },
  { key: 'returnVolatilityAnnual', label: 'Return Volatility',      delta: 0.2 },
  { key: 'inflationAnnual',        label: 'Inflation',              delta: 0.25 },
  { key: 'monthlyContribution',    label: 'Monthly Contribution',   delta: 0.25 },
  { key: 'monthlyExpenses',        label: 'Monthly Expenses',       delta: 0.15 },
  { key: 'monthlyIncome',          label: 'Monthly Income',         delta: 0.15 },
  { key: 'blackSwanAnnualProb',    label: 'Black-Swan Probability', delta: 0.5 },
  { key: 'taxRateOnReturns',       label: 'Tax on Returns',         delta: 0.25 },
];

export interface SensitivityReport {
  base: { endpointP50: number; successProbability: number };
  results: SensitivityResult[];
  durationMs: number;
}

function quickRun(inputs: ScenarioInputs, iterations = 600): { endpointP50: number; successProb: number } {
  const sim = runSimulation({ ...inputs, iterations });
  const sortedF = [...sim.finals].sort((a, b) => a - b);
  return {
    endpointP50: percentile(sortedF, 0.5),
    successProb: sim.finals.filter(v => v >= inputs.wealthTarget).length / sim.finals.length,
  };
}

export function runSensitivityAnalysis(inputs: ScenarioInputs, iterations = 600): SensitivityReport {
  const t0 = performance.now();
  const base = quickRun(inputs, iterations);
  const results: SensitivityResult[] = SENSITIVITY_PARAMS.map(p => {
    const baseValue = inputs[p.key] as number;
    const lowValue = baseValue * (1 - p.delta);
    const highValue = baseValue * (1 + p.delta);
    const lo = quickRun({ ...inputs, [p.key]: lowValue } as ScenarioInputs, iterations);
    const hi = quickRun({ ...inputs, [p.key]: highValue } as ScenarioInputs, iterations);
    const elasticity = base.endpointP50 > 0
      ? ((hi.endpointP50 - lo.endpointP50) / base.endpointP50) / (2 * p.delta)
      : 0;
    return {
      parameter: p.key, label: p.label, baseValue, lowValue, highValue,
      lowEndpointP50: lo.endpointP50, highEndpointP50: hi.endpointP50,
      lowSuccess: lo.successProb, highSuccess: hi.successProb,
      elasticity, swing: Math.abs(hi.endpointP50 - lo.endpointP50),
    };
  });
  results.sort((a, b) => b.swing - a.swing);
  return { base: { endpointP50: base.endpointP50, successProbability: base.successProb }, results, durationMs: Math.round(performance.now() - t0) };
}

export interface OptimizerResult {
  contributionRequired: number | null;
  successAtRequired: number;
  delta: number;
  iterations: number;
  searched: { contribution: number; success: number }[];
  durationMs: number;
}

export function optimizeContribution(
  inputs: ScenarioInputs,
  targetSuccess = 0.8,
  searchIterations = 500,
  maxSteps = 12,
): OptimizerResult {
  const t0 = performance.now();
  let lo = 0;
  let hi = Math.max(inputs.monthlyIncome * 0.8, inputs.monthlyContribution * 5, 1000);
  const trace: { contribution: number; success: number }[] = [];
  const high = quickRun({ ...inputs, monthlyContribution: hi }, searchIterations);
  trace.push({ contribution: hi, success: high.successProb });
  if (high.successProb < targetSuccess) {
    return { contributionRequired: null, successAtRequired: high.successProb, delta: hi - inputs.monthlyContribution, iterations: searchIterations, searched: trace, durationMs: Math.round(performance.now() - t0) };
  }
  let best = hi, bestSuccess = high.successProb;
  for (let step = 0; step < maxSteps; step++) {
    const mid = (lo + hi) / 2;
    const r = quickRun({ ...inputs, monthlyContribution: mid }, searchIterations);
    trace.push({ contribution: mid, success: r.successProb });
    if (r.successProb >= targetSuccess) { best = mid; bestSuccess = r.successProb; hi = mid; }
    else { lo = mid; }
  }
  return { contributionRequired: Math.round(best), successAtRequired: bestSuccess, delta: Math.round(best) - inputs.monthlyContribution, iterations: searchIterations, searched: trace.sort((a, b) => a.contribution - b.contribution), durationMs: Math.round(performance.now() - t0) };
}

export interface WithdrawalReport {
  initialBalance: number;
  annualWithdrawal: number;
  horizonYears: number;
  successProbability: number;
  medianTerminalBalance: number;
  medianYearOfRuin: number | null;
  swr: number;
}

export function simulateWithdrawal(initialBalance: number, withdrawalRate: number, inputs: ScenarioInputs, years = 30, iterations = 1500): WithdrawalReport {
  const months = years * 12;
  const annualWithdrawal = initialBalance * withdrawalRate;
  const monthlyWithdrawal = annualWithdrawal / 12;
  const monthlyReturn = inputs.expectedReturnAnnual / 12;
  const monthlyVol = inputs.returnVolatilityAnnual / Math.sqrt(12);
  const monthlyInflation = Math.pow(1 + inputs.inflationAnnual, 1 / 12) - 1;
  const monthlyBlackSwan = inputs.blackSwanAnnualProb / 12;
  let successes = 0;
  const terminals: number[] = [];
  const ruinMonths: number[] = [];
  for (let it = 0; it < iterations; it++) {
    let bal = initialBalance, wd = monthlyWithdrawal, ruined = -1;
    for (let m = 1; m <= months; m++) {
      wd *= 1 + monthlyInflation;
      const r = monthlyReturn + monthlyVol * gauss();
      let pnl = bal * r;
      if (pnl > 0) pnl *= 1 - inputs.taxRateOnReturns;
      bal = bal + pnl - wd;
      if (Math.random() < monthlyBlackSwan) bal *= 1 - inputs.blackSwanMagnitude;
      if (bal <= 0 && ruined < 0) { ruined = m; bal = 0; break; }
    }
    if (bal > 0) successes++;
    terminals.push(Math.max(0, bal));
    if (ruined > 0) ruinMonths.push(ruined);
  }
  const sortedT = terminals.sort((a, b) => a - b);
  return {
    initialBalance, annualWithdrawal, horizonYears: years,
    successProbability: successes / iterations,
    medianTerminalBalance: percentile(sortedT, 0.5),
    medianYearOfRuin: ruinMonths.length ? percentile([...ruinMonths].sort((a, b) => a - b), 0.5) / 12 : null,
    swr: withdrawalRate,
  };
}

export function findSafeWithdrawalRate(initialBalance: number, inputs: ScenarioInputs, years = 30, targetSurvival = 0.95, iterations = 800): WithdrawalReport {
  let lo = 0.005, hi = 0.12;
  let best: WithdrawalReport | null = null;
  for (let step = 0; step < 10; step++) {
    const mid = (lo + hi) / 2;
    const r = simulateWithdrawal(initialBalance, mid, inputs, years, iterations);
    if (r.successProbability >= targetSurvival) { best = r; lo = mid; }
    else { hi = mid; }
  }
  return best ?? simulateWithdrawal(initialBalance, 0.04, inputs, years, iterations);
}

export interface SequenceRiskReport {
  badEarlyEndpointP50: number;
  badLateEndpointP50: number;
  delta: number;
  asymmetry: number;
}

function runSimulationBiased(p: ScenarioInputs, iterations: number, badFirst: boolean): { finals: number[] } {
  const half = Math.floor(p.horizonMonths / 2);
  const monthlyReturn = p.expectedReturnAnnual / 12;
  const monthlyVol = p.returnVolatilityAnnual / Math.sqrt(12);
  const monthlyIncomeGrowth = Math.pow(1 + p.incomeGrowthAnnual, 1 / 12) - 1;
  const monthlyInflation = Math.pow(1 + p.inflationAnnual, 1 / 12) - 1;
  const skew = 0.6;
  const finals: number[] = [];
  for (let it = 0; it < iterations; it++) {
    let nw = p.startingNetWorth, inc = p.monthlyIncome, exp = p.monthlyExpenses, contrib = p.monthlyContribution;
    for (let m = 1; m <= p.horizonMonths; m++) {
      inc *= 1 + monthlyIncomeGrowth; exp *= 1 + monthlyInflation; contrib *= 1 + monthlyIncomeGrowth;
      const inFirst = m <= half;
      const shift = (inFirst === badFirst ? -1 : 1) * skew * monthlyVol;
      const r = monthlyReturn + shift + monthlyVol * gauss();
      let pnl = nw * r;
      if (pnl > 0) pnl *= 1 - p.taxRateOnReturns;
      nw += (inc - exp) + contrib + pnl;
    }
    finals.push(nw);
  }
  return { finals };
}

export function analyzeSequenceRisk(inputs: ScenarioInputs, iterations = 800): SequenceRiskReport {
  const badEarly = percentile(runSimulationBiased(inputs, iterations, true).finals.sort((a, b) => a - b), 0.5);
  const badLate = percentile(runSimulationBiased(inputs, iterations, false).finals.sort((a, b) => a - b), 0.5);
  const delta = badLate - badEarly;
  const meanEnd = (badLate + badEarly) / 2;
  return { badEarlyEndpointP50: badEarly, badLateEndpointP50: badLate, delta, asymmetry: meanEnd > 0 ? Math.abs(delta) / meanEnd : 0 };
}

export function sampleTrajectories(inputs: ScenarioInputs, n = 8): { month: number; value: number; path: number }[] {
  const sim = runSimulation({ ...inputs, iterations: Math.max(n, 50) });
  const step = Math.max(1, Math.floor(sim.trajectories.length / n));
  const out: { month: number; value: number; path: number }[] = [];
  for (let k = 0; k < n; k++) {
    const path = sim.trajectories[k * step];
    if (!path) continue;
    const every = Math.max(1, Math.floor(path.length / 60));
    for (let m = 0; m < path.length; m += every) out.push({ month: m, value: Math.round(path[m]), path: k });
  }
  return out;
}
