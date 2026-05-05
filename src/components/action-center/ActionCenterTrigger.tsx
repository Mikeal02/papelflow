import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useActionCenterUI } from '@/contexts/ActionCenterContext';
import { useActionCenter } from '@/hooks/useActionCenter';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

/**
 * Floating Action Center trigger — sits in the desktop sidebar / mobile top bar.
 * Pulses gently when critical items exist; shows a count badge.
 */
export function ActionCenterTrigger({ className }: Props) {
  const { setOpen } = useActionCenterUI();
  const { total, counts } = useActionCenter();
  const hasCritical = counts.critical > 0;

  return (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        'relative flex items-center gap-2 rounded-lg px-2.5 h-8 text-[11px] font-medium border transition-colors',
        hasCritical
          ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15'
          : total > 0
            ? 'border-primary/30 bg-primary/8 text-primary hover:bg-primary/12'
            : 'border-border/40 bg-muted/30 text-muted-foreground hover:text-foreground',
        className,
      )}
      aria-label={`Action Center · ${total} items`}
    >
      <Zap className="h-3.5 w-3.5" />
      <span>Inbox</span>
      <AnimatePresence>
        {total > 0 && (
          <motion.span
            key={total}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className={cn(
              'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums',
              hasCritical ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
            )}
          >
            {total > 99 ? '99+' : total}
          </motion.span>
        )}
      </AnimatePresence>
      {hasCritical && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
        </span>
      )}
    </button>
  );
}
