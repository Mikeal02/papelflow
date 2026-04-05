import { useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AppLayout } from './AppLayout';

export function AnimatedLayout() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const pageVariants = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        enter: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
        enter: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        },
        exit: {
          opacity: 0,
          y: -4,
          filter: 'blur(2px)',
          transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
        },
      };

  return (
    <AppLayout>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          className="relative will-change-[opacity,transform]"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}
