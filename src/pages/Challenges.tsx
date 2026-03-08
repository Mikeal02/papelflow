import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { FinancialChallenges } from '@/components/gamification/FinancialChallenges';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Challenges = () => {
  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-5 lg:space-y-7">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text flex items-center gap-3">
                <Trophy className="h-7 w-7" />
                Challenges & Achievements
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Level up your financial skills with challenges and earn badges
              </p>
            </div>
          </motion.div>

          <FinancialChallenges />
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Challenges;
