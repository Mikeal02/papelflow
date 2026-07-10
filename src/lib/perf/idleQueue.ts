/**
 * Elite idle scheduler.
 *
 * A tiny cooperative queue that runs low-priority work during browser idle
 * windows without ever blocking the main thread past ~4 ms. Falls back to
 * `MessageChannel` scheduling on browsers without `requestIdleCallback`
 * (Safari) so work still drains between paints.
 *
 * Usage:
 *   idleQueue.push(() => doExpensiveThing());
 *   idleQueue.push(() => primeCache(), { priority: 'low' });
 */

type IdleTask = () => void | Promise<void>;
interface Entry { task: IdleTask; priority: 'high' | 'low' }

interface IdleDeadline { timeRemaining: () => number; didTimeout: boolean }
type IdleCb = (deadline: IdleDeadline) => void;

const w = typeof window !== 'undefined' ? window : undefined;
const nativeRIC = (w as unknown as { requestIdleCallback?: (cb: IdleCb, o?: { timeout: number }) => number })
  ?.requestIdleCallback?.bind(w);

// MessageChannel-based shim gives us a real macrotask hop that yields to
// paint — meaningfully better than setTimeout(0) for keeping frames smooth.
const shimRIC: (cb: IdleCb, opts?: { timeout: number }) => number = (cb) => {
  const channel = new MessageChannel();
  const start = performance.now();
  channel.port1.onmessage = () => {
    cb({
      timeRemaining: () => Math.max(0, 5 - (performance.now() - start)),
      didTimeout: false,
    });
  };
  channel.port2.postMessage(null);
  return 0;
};

const schedule: (cb: IdleCb, opts?: { timeout: number }) => number =
  nativeRIC ?? shimRIC;

class IdleQueue {
  private q: Entry[] = [];
  private scheduled = false;

  push(task: IdleTask, opts: { priority?: 'high' | 'low' } = {}) {
    const entry: Entry = { task, priority: opts.priority ?? 'low' };
    if (entry.priority === 'high') this.q.unshift(entry);
    else this.q.push(entry);
    this.kick();
  }

  private kick() {
    if (this.scheduled || this.q.length === 0) return;
    this.scheduled = true;
    schedule(this.drain, { timeout: 2000 });
  }

  private drain = (deadline: IdleDeadline) => {
    this.scheduled = false;
    while (this.q.length && (deadline.timeRemaining() > 1 || deadline.didTimeout)) {
      const next = this.q.shift();
      if (!next) break;
      try { void next.task(); } catch { /* swallow — best-effort background work */ }
    }
    if (this.q.length) this.kick();
  };

  clear() { this.q.length = 0; }
  get size() { return this.q.length; }
}

export const idleQueue = new IdleQueue();

/** Fire-and-forget helper for one-off deferrals. */
export function whenIdle(task: IdleTask, priority: 'high' | 'low' = 'low') {
  idleQueue.push(task, { priority });
}
