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
