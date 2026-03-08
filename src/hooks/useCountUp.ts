import { useEffect, useRef, useState, useCallback } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  startOnView?: boolean;
}

export function useCountUp({
  end,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  startOnView = true,
}: UseCountUpOptions) {
  const [value, setValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const ref = useRef<HTMLElement>(null);
  const rafRef = useRef<number>();
  const prevEnd = useRef(end);

  // Intersection observer for "count on view"
  useEffect(() => {
    if (!startOnView || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnView]);

  // Animate value
  useEffect(() => {
    if (!hasStarted) return;

    const startVal = prevEnd.current !== end ? value : 0;
    prevEnd.current = end;
    const startTime = performance.now();

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = startVal + (end - startVal) * easedProgress;
      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, hasStarted, duration]);

  const formatted = `${prefix}${value.toFixed(decimals)}${suffix}`;
  
  return { ref, value, formatted, hasStarted };
}

// Parse a formatted currency string to extract the numeric value
export function parseCurrencyValue(formatted: string): { prefix: string; number: number; suffix: string } {
  // Match patterns like "$1,234.56", "€1.234,56", "1,234.56 USD", etc.
  const match = formatted.match(/^([^\d-]*)([-]?\d[\d,. ]*\d|\d)(.*)$/);
  if (!match) return { prefix: '', number: 0, suffix: '' };
  
  const prefix = match[1];
  const suffix = match[3];
  // Remove thousands separators — keep only last dot/comma as decimal
  let numStr = match[2].replace(/\s/g, '');
  
  // Detect if comma is decimal separator (e.g., 1.234,56)
  const lastComma = numStr.lastIndexOf(',');
  const lastDot = numStr.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Comma is decimal separator
    numStr = numStr.replace(/\./g, '').replace(',', '.');
  } else {
    // Dot is decimal separator
    numStr = numStr.replace(/,/g, '');
  }
  
  return { prefix, number: parseFloat(numStr) || 0, suffix };
}

