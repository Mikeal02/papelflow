/// <reference lib="webworker" />
/**
 * Aggregations worker — pre-computes derived rollups off the main thread.
 * Consumers post transactions and receive a suite of aggregates keyed by
 * scope. Kept intentionally dependency-free so it stays cheap to spin up.
 */

interface Req { id: string; transactions: any[]; accounts?: any[]; }
interface Aggregate {
  monthly: Record<string, { income: number; expense: number; net: number; count: number }>;
  byCategory: Record<string, { total: number; count: number }>;
  byAccount: Record<string, { total: number; count: number }>;
  byDayOfWeek: number[];         // 0..6
  byHourOfDay: number[];         // 0..23
  velocity7d: number;            // spend last 7d
  velocity30d: number;           // spend last 30d
  runwayDays: number | null;     // cash / (avg daily spend)
  topPayees: { payee: string; total: number; count: number }[];
  spendVolatility: number;       // stdev of daily spend
  cashInflowRatio: number;       // income / (income + expense)
  computedAt: number;
}

function empty(): Aggregate {
  return {
    monthly: {}, byCategory: {}, byAccount: {},
    byDayOfWeek: [0,0,0,0,0,0,0], byHourOfDay: new Array(24).fill(0),
    velocity7d: 0, velocity30d: 0, runwayDays: null,
    topPayees: [], spendVolatility: 0, cashInflowRatio: 0,
    computedAt: Date.now(),
  };
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

function compute(txs: any[], accounts: any[] = []): Aggregate {
  const agg = empty();
  const now = Date.now();
  const dayMs = 86_400_000;
  const dailySpendMap = new Map<string, number>();
  const payeeMap = new Map<string, { total: number; count: number }>();
  let income = 0, expense = 0, spend7 = 0, spend30 = 0;

  for (const t of txs) {
    const amt = Number(t.amount) || 0;
    const d = new Date(t.date || t.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const m = agg.monthly[key] ??= { income: 0, expense: 0, net: 0, count: 0 };
    m.count++;
    if (t.type === 'income') { m.income += amt; income += amt; }
    else if (t.type === 'expense') {
      m.expense += amt; expense += amt;
      const ageDays = (now - d.getTime()) / dayMs;
      if (ageDays <= 7) spend7 += amt;
      if (ageDays <= 30) spend30 += amt;
      const dk = d.toISOString().slice(0, 10);
      dailySpendMap.set(dk, (dailySpendMap.get(dk) || 0) + amt);
      if (t.category_id) {
        const c = agg.byCategory[t.category_id] ??= { total: 0, count: 0 };
        c.total += amt; c.count++;
      }
      if (t.payee) {
        const p = payeeMap.get(t.payee) ?? { total: 0, count: 0 };
        p.total += amt; p.count++;
        payeeMap.set(t.payee, p);
      }
    }
    m.net = m.income - m.expense;
    if (t.account_id) {
      const a = agg.byAccount[t.account_id] ??= { total: 0, count: 0 };
      a.total += amt; a.count++;
    }
    agg.byDayOfWeek[d.getDay()]++;
    agg.byHourOfDay[d.getHours()]++;
  }

  agg.velocity7d = spend7;
  agg.velocity30d = spend30;
  const avgDaily = spend30 / 30;
  const cash = accounts.filter(a => a.type !== 'loan' && a.type !== 'credit_card')
    .reduce((s, a) => s + (Number(a.balance) || 0), 0);
  agg.runwayDays = avgDaily > 0 ? Math.round(cash / avgDaily) : null;

  agg.topPayees = [...payeeMap.entries()]
    .map(([payee, v]) => ({ payee, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  agg.spendVolatility = stdev([...dailySpendMap.values()]);
  const denom = income + expense;
  agg.cashInflowRatio = denom > 0 ? income / denom : 0;
  return agg;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, transactions, accounts } = e.data;
  try {
    const result = compute(transactions || [], accounts || []);
    (self as any).postMessage({ id, ok: true, result });
  } catch (err: any) {
    (self as any).postMessage({ id, ok: false, error: err?.message ?? String(err) });
  }
};

export {};
