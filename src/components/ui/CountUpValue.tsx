import { useRef, useEffect, useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface CountUpValueProps {
  value: string;
  className?: string;
  duration?: number;
}

function parseFormattedNumber(formatted: string): { prefix: string; num: number; decimals: number; suffix: string } {
  const match = formatted.match(/^([^\d-]*)([-]?[\d,. ]+)(.*)$/);
  if (!match) return { prefix: '', num: 0, decimals: 0, suffix: '' };

  const prefix = match[1];
  const suffix = match[3];
  let numStr = match[2].replace(/\s/g, '');

  const lastComma = numStr.lastIndexOf(',');
  const lastDot = numStr.lastIndexOf('.');

  if (lastComma > lastDot) {
    numStr = numStr.replace(/\./g, '').replace(',', '.');
  } else {
    numStr = numStr.replace(/,/g, '');
  }

  const num = parseFloat(numStr) || 0;
  const decPart = numStr.split('.')[1];
  const decimals = decPart ? decPart.length : 0;

  return { prefix, num, decimals, suffix };
}

function formatWithOriginalStyle(num: number, decimals: number, prefix: string, suffix: string): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const fixed = absNum.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let result = `${prefix}${sign}${withSeparators}`;
  if (decPart) result += `.${decPart}`;
  result += suffix;
  return result;
}

// Custom easing for a luxurious deceleration feel
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

export const CountUpValue = memo(function CountUpValue({ value, className, duration = 1200 }: CountUpValueProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);
  const rafRef = useRef<number>();
  const prevValue = useRef(value);

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

  useEffect(() => {
    if (!hasAnimated) {
      setDisplay(value);
      return;
    }

    const { prefix, num: endNum, decimals, suffix } = parseFormattedNumber(value);
    const { num: startNum } = parseFormattedNumber(prevValue.current);
    prevValue.current = value;

    const from = startNum === endNum ? 0 : startNum;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = from + (endNum - from) * eased;

      setDisplay(formatWithOriginalStyle(current, decimals, prefix, suffix));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
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
