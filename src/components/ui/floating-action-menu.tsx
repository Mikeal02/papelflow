import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Receipt, ArrowDownUp, Target, CreditCard, PiggyBank, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface FloatingAction {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  color: string;
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
      onClick: () => {
        onAddTransaction?.();
        setIsOpen(false);
      },
      color: 'bg-primary',
    },
    {
      icon: ArrowDownUp,
      label: 'Transfer',
      onClick: () => {
        navigate('/accounts');
        setIsOpen(false);
      },
      color: 'bg-chart-3',
    },
    {
      icon: Target,
      label: 'Add Goal',
      onClick: () => {
        navigate('/goals');
        setIsOpen(false);
      },
      color: 'bg-income',
    },
    {
      icon: CreditCard,
      label: 'Add Budget',
      onClick: () => {
        navigate('/budgets');
        setIsOpen(false);
      },
      color: 'bg-chart-4',
    },
  ];

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Actions */}
            <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3">
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={action.onClick}
                  className="flex items-center gap-3 group"
                >
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                    className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-medium shadow-lg whitespace-nowrap"
                  >
                    {action.label}
                  </motion.span>
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center text-white shadow-lg',
                      'transition-transform group-hover:scale-110',
                      action.color
                    )}
                  >
                    <action.icon className="h-5 w-5" />
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-14 w-14 rounded-full flex items-center justify-center',
          'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
          'shadow-lg shadow-primary/25 transition-all duration-300',
          isOpen && 'rotate-45 bg-gradient-to-br from-destructive to-destructive/80 shadow-destructive/25'
        )}
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </motion.div>
      </motion.button>

      {/* Pulse ring */}
      {!isOpen && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/30"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </div>
  );
};
