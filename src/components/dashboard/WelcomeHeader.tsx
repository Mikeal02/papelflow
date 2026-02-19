import { motion } from 'framer-motion';
import { Calendar, Bell, Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { Badge } from '@/components/ui/badge';

export function WelcomeHeader() {
  const { data: profile } = useProfile();
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div className="min-w-0">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <h1 className="text-2xl md:text-3xl font-bold truncate">
            <span className="gradient-text">{getGreeting()}</span>, {firstName}
          </h1>
          <Badge variant="outline" className="hidden sm:flex gap-1 text-[10px] font-medium border-primary/20 text-primary bg-primary/5">
            <span className="h-1.5 w-1.5 rounded-full bg-income animate-pulse" />
            Live
          </Badge>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground mt-1"
        >
          Here's your financial overview • {currentTime}
        </motion.p>
      </div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-2"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/30">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium truncate">{currentDate}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
