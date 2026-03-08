import { useRef, useEffect, useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface CountUpValueProps {
  value: string; // formatted currency string like "$1,234.56"
  className?: string;
  duration?: number;
}

function parseFormattedNumber(formatted: string): { prefix: string; num: number; decimals: number; suffix: string; raw: string } {
  const match = formatted.match(/^([^\d-]*)([-]?[\d,. ]+)(.*)$/);
  if (!match) return { prefix: '', num: 0, decimals: 0, suffix: '', raw: formatted };

  const prefix = match[1];
  const suffix = match[3];
  let numStr = match[2].replace(/\s/g, '');

  const lastComma = numStr.lastIndexOf(',');
  const lastDot = numStr.lastIndexOf('.');

  let decimalSep = '.';
  if (lastComma > lastDot) {
    numStr = numStr.replace(/\./g, '').replace(',', '.');
    decimalSep = ',';
  } else {
    numStr = numStr.replace(/,/g, '');
  }

  const num = parseFloat(numStr) || 0;
  const decPart = numStr.split('.')[1];
  const decimals = decPart ? decPart.length : 0;

  return { prefix, num, decimals, suffix, raw: formatted };
}

function formatWithOriginalStyle(num: number, decimals: number, original: string, prefix: string, suffix: string): string {
  // Format number with proper separators matching original style
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const fixed = absNum.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  // Add thousand separators
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let result = `${prefix}${sign}${withSeparators}`;
  if (decPart) result += `.${decPart}`;
  result += suffix;
  return result;
}

export const CountUpValue = memo(function CountUpValue({ value, className, duration = 1400 }: CountUpValueProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);
  const rafRef = useRef<number>();
  const prevValue = useRef(value);

  // Intersection observer
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  // Animate
  useEffect(() => {
    if (!hasAnimated) {
      setDisplay(value);
      return;
    }

    const { prefix, num: endNum, decimals, suffix } = parseFormattedNumber(value);
    const { num: startNum } = parseFormattedNumber(prevValue.current);
    prevValue.current = value;

    // If value changed after initial animation, animate from old to new
    const from = startNum === endNum ? 0 : startNum;
    const startTime = performance.now();

    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = from + (endNum - from) * eased;

      setDisplay(formatWithOriginalStyle(current, decimals, value, prefix, suffix));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value); // Ensure exact final value
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, hasAnimated, duration]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {display}
    </span>
  );
});
