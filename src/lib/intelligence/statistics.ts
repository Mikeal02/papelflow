/**
 * Core statistical primitives — numerically stable single-pass algorithms.
 */

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Welford's online algorithm — variance without overflow. */
export function welford(xs: number[]): { mean: number; variance: number; stdev: number; n: number } {
  let n = 0, m = 0, m2 = 0;
  for (const x of xs) {
    n++;
    const d = x - m;
    m += d / n;
    m2 += d * (x - m);
  }
  const variance = n > 1 ? m2 / (n - 1) : 0;
  return { mean: m, variance, stdev: Math.sqrt(variance), n };
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median Absolute Deviation — robust to outliers. */
export function mad(xs: number[]): { median: number; mad: number } {
  const med = median(xs);
  const dev = xs.map(x => Math.abs(x - med));
  return { median: med, mad: median(dev) };
}

/** Modified Z-score using MAD — robust outlier detection. */
export function modifiedZScore(xs: number[]): number[] {
  const { median: med, mad: m } = mad(xs);
  const denom = m === 0 ? 1e-9 : 1.4826 * m;
  return xs.map(x => (x - med) / denom);
}

export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

/** Exponentially weighted moving average. */
export function ema(xs: number[], alpha = 0.3): number[] {
  if (!xs.length) return [];
  const out = [xs[0]];
  for (let i = 1; i < xs.length; i++) out.push(alpha * xs[i] + (1 - alpha) * out[i - 1]);
  return out;
}

/** Pearson correlation. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n)), my = mean(ys.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

/** Autocorrelation at lag k. */
export function autocorrelation(xs: number[], lag: number): number {
  if (xs.length <= lag) return 0;
  return pearson(xs.slice(0, xs.length - lag), xs.slice(lag));
}

/** Linear regression (least squares). Returns slope, intercept, r². */
export function linearRegression(ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const mx = (n - 1) / 2, my = mean(ys);
  let num = 0, den = 0, ssTot = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; ssTot += (ys[i] - my) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  let ssRes = 0;
  for (let i = 0; i < n; i++) { const f = slope * xs[i] + intercept; ssRes += (ys[i] - f) ** 2; }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

/** Levenshtein edit distance — for payee clustering. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1).fill(0).map((_, j) => j);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}
