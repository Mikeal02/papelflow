import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  colorize?: boolean;
}

export const AnimatedCounter = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1,
  className,
  colorize = false,
}: AnimatedCounterProps) => {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(latest.toFixed(decimals));
    });
    return unsubscribe;
  }, [springValue, decimals]);

  return (
    <span
      className={cn(
        'tabular-nums',
        colorize && value > 0 && 'text-income',
        colorize && value < 0 && 'text-expense',
        className
      )}
    >
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

// Animated digits that flip
interface FlipDigitProps {
  value: string;
  className?: string;
}

export const FlipDigit = ({ value, className }: FlipDigitProps) => {
  return (
    <motion.span
      key={value}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn('inline-block', className)}
    >
      {value}
    </motion.span>
  );
};

// Sparkline mini chart
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
  className?: string;
}

export const Sparkline = ({
  data,
  width = 80,
  height = 24,
  color = 'hsl(var(--primary))',
  showDot = true,
  className,
}: SparklineProps) => {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  const lastPoint = {
    x: width,
    y: height - ((data[data.length - 1] - min) / range) * height,
  };

  const trend = data[data.length - 1] >= data[0] ? 'up' : 'down';
  const trendColor = trend === 'up' ? 'hsl(var(--income))' : 'hsl(var(--expense))';

  return (
    <svg width={width} height={height + 4} className={className}>
      <defs>
        <linearGradient id={`sparkline-gradient-${data.join('-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={trendColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path
        d={areaD}
        fill={`url(#sparkline-gradient-${data.join('-')})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      {showDot && (
        <motion.circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={3}
          fill={trendColor}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8 }}
        />
      )}
    </svg>
  );
};
