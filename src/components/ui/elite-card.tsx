import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EliteCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'primary' | 'income' | 'expense' | 'accent';
  intensity?: 'low' | 'medium' | 'high';
  enableReflection?: boolean;
}

export function EliteCard({
  children,
  className,
  glowColor = 'primary',
  intensity = 'medium',
  enableReflection = true,
}: EliteCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const colorMap = {
    primary: 'var(--primary)',
    income: 'var(--income)',
    expense: 'var(--expense)',
    accent: 'var(--accent)',
  };

  const intensityMap = {
    low: { shadow: 0.1, glow: 0.15 },
    medium: { shadow: 0.2, glow: 0.25 },
    high: { shadow: 0.35, glow: 0.4 },
  };

  const { shadow, glow } = intensityMap[intensity];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-card border border-border/30',
        'transition-shadow duration-300',
        className
      )}
      whileHover={{
        boxShadow: `0 25px 50px -12px hsl(${colorMap[glowColor]} / ${shadow}), 0 12px 24px -8px hsl(var(--foreground) / 0.05)`,
      }}
    >
      {/* Multi-layer background */}
      <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-muted/20" />
      
      {/* Animated border gradient */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, 
            hsl(${colorMap[glowColor]} / ${glow}), 
            transparent 60%, 
            hsl(var(--accent) / ${glow * 0.6}), 
            transparent 80%, 
            hsl(${colorMap[glowColor]} / ${glow}))`,
          padding: 1,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Glare effect */}
      {enableReflection && (
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at ${glareX}% ${glareY}%, hsl(0 0% 100% / 0.15), transparent 50%)`,
          }}
        />
      )}

      {/* Inner content with 3D depth */}
      <div style={{ transform: 'translateZ(20px)' }} className="relative z-10">
        {children}
      </div>

      {/* Bottom reflection */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(var(--card) / 0.8), transparent)',
        }}
      />
    </motion.div>
  );
}

// Floating badge with glow
interface GlowBadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'income' | 'expense' | 'warning';
  pulse?: boolean;
  className?: string;
}

export function GlowBadge({ children, variant = 'primary', pulse = false, className }: GlowBadgeProps) {
  const variantStyles = {
    primary: 'bg-primary/15 text-primary border-primary/20',
    income: 'bg-income/15 text-income border-income/20',
    expense: 'bg-expense/15 text-expense border-expense/20',
    warning: 'bg-warning/15 text-warning border-warning/20',
  };

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
        variantStyles[variant],
        pulse && 'animate-pulse',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.span>
  );
}

// Animated number with morphing effect
interface MorphNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function MorphNumber({ value, prefix = '', suffix = '', className }: MorphNumberProps) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {prefix}{value.toLocaleString()}{suffix}
    </motion.span>
  );
}
