import { motion } from 'framer-motion';

interface AmbientBackgroundProps {
  variant?: 'default' | 'warm' | 'cool' | 'purple';
}

export function AmbientBackground({ variant = 'default' }: AmbientBackgroundProps) {
  const colorMap = {
    default: {
      orb1: 'bg-primary/[0.04]',
      orb2: 'bg-accent/[0.03]',
      orb3: 'bg-chart-6/[0.02]',
    },
    warm: {
      orb1: 'bg-warning/[0.04]',
      orb2: 'bg-expense/[0.03]',
      orb3: 'bg-accent/[0.02]',
    },
    cool: {
      orb1: 'bg-primary/[0.05]',
      orb2: 'bg-income/[0.03]',
      orb3: 'bg-accent/[0.02]',
    },
    purple: {
      orb1: 'bg-chart-4/[0.04]',
      orb2: 'bg-primary/[0.03]',
      orb3: 'bg-accent/[0.025]',
    },
  };

  const colors = colorMap[variant];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Primary floating orb */}
      <motion.div
        className={`absolute w-[600px] h-[600px] ${colors.orb1} rounded-full blur-[120px]`}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ top: '10%', left: '5%' }}
      />
      
      {/* Secondary floating orb */}
      <motion.div
        className={`absolute w-[500px] h-[500px] ${colors.orb2} rounded-full blur-[100px]`}
        animate={{
          x: [0, -40, 0],
          y: [0, 50, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ bottom: '10%', right: '5%' }}
      />
      
      {/* Tertiary accent orb */}
      <motion.div
        className={`absolute w-[400px] h-[400px] ${colors.orb3} rounded-full blur-[80px]`}
        animate={{
          x: [0, 30, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      
      {/* Mesh gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, hsl(var(--primary) / 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, hsl(var(--accent) / 0.02) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, hsl(var(--chart-6) / 0.015) 0%, transparent 60%)
          `,
        }}
      />
    </div>
  );
}
