import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, ArrowDownUp, Target, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface FloatingAction {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  color: string;
  shortcut?: string;
}

interface FloatingActionMenuProps {
  onAddTransaction?: () => void;
}

export const FloatingActionMenu = ({ onAddTransaction }: FloatingActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions: FloatingAction[] = [
    {
      icon: Receipt,
      label: 'Add Transaction',
      shortcut: 'T',
      onClick: () => {
        onAddTransaction?.();
        setIsOpen(false);
      },
      color: 'bg-primary',
    },
    {
      icon: ArrowDownUp,
      label: 'Transfer',
      shortcut: 'R',
      onClick: () => {
        navigate('/accounts');
        setIsOpen(false);
      },
      color: 'bg-chart-3',
    },
    {
      icon: Target,
      label: 'Add Goal',
      shortcut: 'G',
      onClick: () => {
        navigate('/goals');
        setIsOpen(false);
      },
      color: 'bg-income',
    },
    {
      icon: CreditCard,
      label: 'Add Budget',
      shortcut: 'B',
      onClick: () => {
        navigate('/budgets');
        setIsOpen(false);
      },
      color: 'bg-chart-4',
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-2.5 z-50">
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 16, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.9 }}
                  transition={{ delay: index * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={action.onClick}
                  className="flex items-center gap-3 group"
                >
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 + 0.08 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/50 text-sm font-medium shadow-lg whitespace-nowrap"
                  >
                    {action.label}
                    {action.shortcut && (
                      <kbd className="text-[9px] px-1 py-0.5 rounded border border-border/50 bg-muted/50 text-muted-foreground font-mono">
                        {action.shortcut}
                      </kbd>
                    )}
                  </motion.span>
                  <div
                    className={cn(
                      'h-11 w-11 rounded-full flex items-center justify-center text-primary-foreground shadow-lg',
                      'transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl',
                      action.color
                    )}
                  >
                    <action.icon className="h-4.5 w-4.5" />
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative h-14 w-14 rounded-full flex items-center justify-center z-50',
          'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
          'shadow-lg shadow-primary/25 transition-colors duration-300',
          isOpen && 'from-destructive to-destructive/80 shadow-destructive/25'
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <Plus className="h-6 w-6" />
        </motion.div>
      </motion.button>
    </div>
  );
};
