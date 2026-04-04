import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

import { FinancialChallenges } from '@/components/gamification/FinancialChallenges';

const Challenges = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-warning/15 to-warning/5 flex items-center justify-center border border-border/30">
            <Trophy className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Challenges & Achievements</h1>
            <p className="text-sm text-muted-foreground">
              Level up your financial skills and earn badges
            </p>
          </div>
        </div>
      </motion.div>

      <FinancialChallenges />
    </div>
  );
};

export default Challenges;
