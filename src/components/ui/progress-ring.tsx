import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  color?: 'primary' | 'income' | 'expense' | 'warning' | 'accent';
  showGlow?: boolean;
  animated?: boolean;
}

const colorMap = {
  primary: 'stroke-primary',
  income: 'stroke-income',
  expense: 'stroke-expense',
  warning: 'stroke-warning',
  accent: 'stroke-accent',
};

const glowMap = {
  primary: 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]',
  income: 'drop-shadow-[0_0_8px_hsl(var(--income)/0.5)]',
  expense: 'drop-shadow-[0_0_8px_hsl(var(--expense)/0.5)]',
  warning: 'drop-shadow-[0_0_8px_hsl(var(--warning)/0.5)]',
  accent: 'drop-shadow-[0_0_8px_hsl(var(--accent)/0.5)]',
};

export const ProgressRing = ({
  progress,
  size = 80,
  strokeWidth = 8,
  className,
  children,
  color = 'primary',
  showGlow = true,
  animated = true,
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(colorMap[color], showGlow && glowMap[color])}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

// Multi-segment ring for multiple values
interface MultiProgressRingProps {
  segments: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

export const MultiProgressRing = ({
  segments,
  size = 80,
  strokeWidth = 8,
  className,
  children,
}: MultiProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  let currentOffset = 0;

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        
        {/* Segments */}
        {segments.map((segment, index) => {
          const segmentLength = (segment.value / 100) * circumference;
          const offset = currentOffset;
          currentOffset += segmentLength;
          
          return (
            <motion.circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            />
          );
        })}
      </svg>

      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};
