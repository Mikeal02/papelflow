import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlowingBorderProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'primary' | 'income' | 'expense' | 'accent' | 'rainbow';
  intensity?: 'low' | 'medium' | 'high';
  animated?: boolean;
}

export const GlowingBorder = ({
  children,
  className,
  glowColor = 'primary',
  intensity = 'medium',
  animated = true,
}: GlowingBorderProps) => {
  const intensityMap = {
    low: 'opacity-30',
    medium: 'opacity-50',
    high: 'opacity-70',
  };

  const gradientMap = {
    primary: 'from-primary via-accent to-primary',
    income: 'from-income via-chart-3 to-income',
    expense: 'from-expense via-chart-5 to-expense',
    accent: 'from-accent via-primary to-accent',
    rainbow: 'from-chart-1 via-chart-4 to-chart-6',
  };

  return (
    <div className={cn('relative rounded-2xl p-[1px]', className)}>
      {/* Animated border */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-2xl bg-gradient-to-r',
          gradientMap[glowColor],
          intensityMap[intensity],
          animated && 'animate-spin-slow'
        )}
        style={{
          backgroundSize: animated ? '200% 200%' : '100% 100%',
        }}
        animate={animated ? {
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        } : {}}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Glow effect */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl blur-xl',
          'bg-gradient-to-r',
          gradientMap[glowColor],
          intensityMap[intensity]
        )}
      />

      {/* Content container */}
      <div className="relative bg-card rounded-2xl">
        {children}
      </div>
    </div>
  );
};

// Animated shine effect
export const ShineEffect = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

// Pulsing dot indicator
export const PulsingDot = ({ 
  color = 'primary',
  size = 'md' 
}: { 
  color?: 'primary' | 'income' | 'expense' | 'warning';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeMap = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const colorMap = {
    primary: 'bg-primary',
    income: 'bg-income',
    expense: 'bg-expense',
    warning: 'bg-warning',
  };

  return (
    <span className="relative flex">
      <span
        className={cn(
          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
          colorMap[color]
        )}
      />
      <span className={cn('relative inline-flex rounded-full', sizeMap[size], colorMap[color])} />
    </span>
  );
};

// Gradient badge
export const GradientBadge = ({ 
  children, 
  variant = 'primary' 
}: { 
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'premium';
}) => {
  const variantMap = {
    primary: 'from-primary to-accent text-primary-foreground',
    success: 'from-income to-chart-3 text-white',
    warning: 'from-warning to-chart-4 text-warning-foreground',
    premium: 'from-chart-6 to-primary text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        'bg-gradient-to-r',
        variantMap[variant]
      )}
    >
      {children}
    </span>
  );
};
