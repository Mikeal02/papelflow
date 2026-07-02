import { useEffect, useRef, useState } from 'react';
import { useTransactions } from './useTransactions';
import { useAccounts } from './useAccounts';

type Agg = {
  monthly: Record<string, { income: number; expense: number; net: number; count: number }>;
  byCategory: Record<string, { total: number; count: number }>;
  byAccount: Record<string, { total: number; count: number }>;
  byDayOfWeek: number[];
  byHourOfDay: number[];
  velocity7d: number;
  velocity30d: number;
  runwayDays: number | null;
  topPayees: { payee: string; total: number; count: number }[];
  spendVolatility: number;
  cashInflowRatio: number;
  computedAt: number;
};

function makeWorker(): Worker | null {
  try {
    return new Worker(new URL('../lib/data/aggregations.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}

/**
 * Off-main-thread rollups over transactions + accounts. Recomputes when
 * either changes; consumers get instant, memoized aggregates for charts,
 * heatmaps, and health metrics without blocking render.
 */
export function useAggregations(): { data: Agg | null; loading: boolean; durationMs: number } {
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const [data, setData] = useState<Agg | null>(null);
  const [loading, setLoading] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    workerRef.current = makeWorker();
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    if (!transactions || transactions.length === 0) { setData(null); return; }
    const id = `a${++reqIdRef.current}`;
    const start = performance.now();
    setLoading(true);
    const onMsg = (e: MessageEvent<any>) => {
      if (e.data.id !== id) return;
      workerRef.current?.removeEventListener('message', onMsg);
      setLoading(false);
      setDurationMs(Math.round(performance.now() - start));
      if (e.data.ok) setData(e.data.result);
    };
    workerRef.current.addEventListener('message', onMsg);
    workerRef.current.postMessage({ id, transactions, accounts });
  }, [transactions, accounts]);

  return { data, loading, durationMs };
}
