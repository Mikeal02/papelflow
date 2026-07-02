import { useDataPipeline } from '@/hooks/useDataPipeline';
import { CloudCog, CloudOff, Loader2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { drain, purgeQueue, listQueue } from '@/lib/data/offlineQueue';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

/**
 * Compact status pill for the elite data pipeline: shows hydration,
 * connectivity, queue depth, and lets the user retry or purge stuck writes.
 */
export function DataPipelineIndicator() {
  const { user } = useAuth();
  const { hydrated, queue, hydratingError, lastHydratedAt } = useDataPipeline();
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    void listQueue(user.id).then(setPreview);
  }, [user?.id, queue.size, queue.lastDrainAt]);

  const state =
    hydratingError ? 'error' :
    !queue.online ? 'offline' :
    !hydrated ? 'hydrating' :
    queue.size > 0 ? 'syncing' :
    'ready';

  const tone: Record<string, string> = {
    ready:     'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
    syncing:   'text-amber-500 border-amber-500/30 bg-amber-500/10',
    hydrating: 'text-sky-500 border-sky-500/30 bg-sky-500/10',
    offline:   'text-muted-foreground border-border bg-muted/40',
    error:     'text-destructive border-destructive/40 bg-destructive/10',
  };

  const icon = state === 'offline' ? <CloudOff className="w-3.5 h-3.5" />
    : state === 'ready' ? <CloudCheck className="w-3.5 h-3.5" />
    : state === 'error' ? <AlertTriangle className="w-3.5 h-3.5" />
    : <Loader2 className="w-3.5 h-3.5 animate-spin" />;

  const label = state === 'offline' ? 'Offline'
    : state === 'ready' ? 'Synced'
    : state === 'error' ? 'Sync error'
    : state === 'hydrating' ? 'Hydrating'
    : `Syncing · ${queue.size}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md transition-colors ${tone[state]}`}
          aria-label="Data pipeline status"
        >
          {icon}
          <span className="tabular-nums">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">Data pipeline</div>
            <div className="text-xs text-muted-foreground">
              IndexedDB · Realtime · Offline queue
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="State" value={state} />
            <Stat label="Queue" value={String(queue.size)} />
            <Stat label="Failing" value={String(queue.failing)} />
            <Stat label="Online" value={queue.online ? 'yes' : 'no'} />
            <Stat label="Last hydrate" value={lastHydratedAt ? new Date(lastHydratedAt).toLocaleTimeString() : '—'} />
            <Stat label="Last drain" value={queue.lastDrainAt ? new Date(queue.lastDrainAt).toLocaleTimeString() : '—'} />
          </div>
          {queue.lastError && (
            <div className="text-[11px] text-destructive break-all">
              {queue.lastError}
            </div>
          )}
          {preview.length > 0 && (
            <div className="max-h-32 overflow-auto rounded-md border border-border/60 divide-y divide-border/40">
              {preview.slice(0, 6).map(m => (
                <div key={m.id} className="px-2 py-1.5 text-[11px] flex justify-between gap-2">
                  <span className="truncate">{m.op} · {m.table}</span>
                  <span className="text-muted-foreground tabular-nums">×{m.attempts}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1"
              onClick={() => user && drain(user.id)}>
              <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
            <Button size="sm" variant="ghost" className="flex-1"
              onClick={() => user && purgeQueue(user.id)}>
              Purge queue
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold tabular-nums">{value}</div>
    </div>
  );
}
