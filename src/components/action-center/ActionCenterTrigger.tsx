import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useActionCenterUI } from '@/contexts/ActionCenterContext';
import { useActionCenter } from '@/hooks/useActionCenter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

/**
 * Floating Action Center trigger.
 * Pulses on critical, shows count badge, hover preview of top 3 insights.
 */
export function ActionCenterTrigger({ className }: Props) {
  const { setOpen } = useActionCenterUI();
  const { actions, total, counts } = useActionCenter();
  const hasCritical = counts.critical > 0;
  const top = actions.slice(0, 3);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(true)}
            className={cn(
              'relative flex items-center gap-2 rounded-lg px-2.5 h-8 text-[11px] font-medium border transition-all duration-200 shine-sweep overflow-hidden',
              hasCritical
                ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15'
                : total > 0
                  ? 'conic-ring border-transparent bg-primary/8 text-primary hover:bg-primary/12'
                  : 'border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground',
              className,
            )}
            aria-label={`Action Center · ${total} items`}
          >
            <Zap className="h-3.5 w-3.5 relative z-10" />
            <span className="relative z-10">Inbox</span>
            <AnimatePresence>
              {total > 0 && (
                <motion.span
                  key={total}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className={cn(
                    'relative z-10 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums shadow-sm',
                    hasCritical ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
                  )}
                >
                  {total > 99 ? '99+' : total}
                </motion.span>
              )}
            </AnimatePresence>
            {hasCritical && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
            )}
          </button>
        </TooltipTrigger>
        {top.length > 0 && (
          <TooltipContent side="bottom" align="end" className="p-2 max-w-[260px]">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              Top {top.length} insights
            </p>
            <div className="space-y-1">
              {top.map(a => (
                <div key={a.id} className="flex items-center gap-2 text-[11px]">
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    a.severity === 'critical' ? 'bg-destructive' :
                    a.severity === 'high' ? 'bg-warning' :
                    a.severity === 'medium' ? 'bg-primary' : 'bg-muted-foreground'
                  )} />
                  <span className="truncate">{a.title}</span>
                  <span className="ml-auto text-muted-foreground tabular-nums shrink-0">{a.priority}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 pt-1.5 border-t border-border/40">⌘J to open</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
