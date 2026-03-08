import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  intensity?: 'low' | 'medium' | 'high';
}

const variantColors = {
  default: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-6))'],
  success: ['hsl(var(--income))', 'hsl(var(--accent))', 'hsl(var(--chart-3))'],
  warning: ['hsl(var(--warning))', 'hsl(var(--chart-4))', 'hsl(var(--primary))'],
  danger: ['hsl(var(--expense))', 'hsl(var(--chart-5))', 'hsl(var(--warning))'],
};

export const AuroraBackground = ({ 
  children, 
  className, 
  variant = 'default',
  intensity = 'medium' 
}: AuroraBackgroundProps) => {
  const colors = variantColors[variant];
  const opacityMap = { low: 0.1, medium: 0.2, high: 0.35 };
  const opacity = opacityMap[intensity];

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Aurora layers */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 40%, ${colors[0]} 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 70% 60%, ${colors[1]} 0%, transparent 50%),
              radial-gradient(ellipse 70% 60% at 50% 80%, ${colors[2]} 0%, transparent 50%)
            `,
            opacity,
            filter: 'blur(60px)',
          }}
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 60, repeat: Infinity, ease: 'linear' },
            scale: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
        <motion.div
          className="absolute w-[150%] h-[150%] -top-1/4 -right-1/4"
          style={{
            background: `
              radial-gradient(ellipse 50% 70% at 80% 30%, ${colors[1]} 0%, transparent 50%),
              radial-gradient(ellipse 40% 50% at 30% 70%, ${colors[2]} 0%, transparent 50%)
            `,
            opacity: opacity * 0.7,
            filter: 'blur(80px)',
          }}
          animate={{
            rotate: [360, 0],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            rotate: { duration: 80, repeat: Infinity, ease: 'linear' },
            x: { duration: 15, repeat: Infinity, ease: 'easeInOut' },
            y: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Reactive particles that respond to data
interface ReactiveParticlesProps {
  intensity: number; // 0-100
  color?: string;
  count?: number;
}

export const ReactiveParticles = ({ 
  intensity, 
  color = 'hsl(var(--primary))',
  count = 30 
}: ReactiveParticlesProps) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 2,
  }));

  const activeCount = Math.floor((intensity / 100) * count);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.slice(0, activeCount).map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: color,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// Morphing blob background
export const MorphingBlob = ({ 
  color = 'hsl(var(--primary))',
  size = 300,
  className 
}: { 
  color?: string; 
  size?: number;
  className?: string;
}) => {
  return (
    <motion.div
      className={cn('absolute rounded-full blur-3xl', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        opacity: 0.15,
      }}
      animate={{
        borderRadius: [
          '60% 40% 30% 70% / 60% 30% 70% 40%',
          '30% 60% 70% 40% / 50% 60% 30% 60%',
          '50% 60% 30% 60% / 40% 30% 70% 50%',
          '60% 40% 60% 30% / 70% 50% 40% 60%',
          '60% 40% 30% 70% / 60% 30% 70% 40%',
        ],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};
