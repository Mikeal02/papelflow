import { useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLayout } from './AppLayout';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
    filter: 'blur(6px)',
    scale: 0.99,
  },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
      scale: { duration: 0.35 },
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(4px)',
    scale: 0.99,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export function AnimatedLayout() {
  const location = useLocation();

  return (
    <AppLayout>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          className="relative"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}
