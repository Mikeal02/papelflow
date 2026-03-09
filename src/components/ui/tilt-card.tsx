import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glareEnabled?: boolean;
  borderGlow?: boolean;
  perspective?: number;
}

export const TiltCard = ({
  children,
  className,
  intensity = 12,
  glareEnabled = true,
  borderGlow = true,
  perspective = 1000,
}: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 35, mass: 0.5 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 35, mass: 0.5 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${intensity}deg`, `-${intensity}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${intensity}deg`, `${intensity}deg`]);
  const scale = useSpring(1, { stiffness: 400, damping: 30 });

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['0%', '100%']);
  const glareOpacity = useTransform(mouseXSpring, [-0.5, 0, 0.5], [0.15, 0.05, 0.15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    scale.set(1.02);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
    scale.set(1);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        scale,
        transformStyle: 'preserve-3d',
        perspective: `${perspective}px`,
      }}
      className={cn(
        'relative rounded-2xl transition-shadow duration-400',
        isHovered && borderGlow && 'shadow-[0_0_40px_-8px_hsl(var(--primary)/0.35)]',
        className
      )}
    >
      {/* Animated border gradient on hover */}
      {borderGlow && (
        <motion.div
          className="absolute -inset-[1px] rounded-2xl pointer-events-none"
          style={{
            background: isHovered
              ? `linear-gradient(135deg, 
                  hsl(var(--primary) / 0.4) 0%, 
                  hsl(var(--accent) / 0.3) 50%,
                  hsl(var(--chart-6) / 0.2) 100%)`
              : 'transparent',
            opacity: isHovered ? 1 : 0,
            transition: 'all 0.4s ease',
          }}
        />
      )}

      {/* Inner background to clip the gradient border */}
      {borderGlow && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'hsl(var(--card))',
            opacity: isHovered ? 1 : 0,
          }}
        />
      )}

      {/* Multi-layer glare effect */}
      {glareEnabled && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
          style={{
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {/* Primary glare */}
          <motion.div
            className="absolute w-[250%] h-[250%]"
            style={{
              background: 'radial-gradient(circle, hsl(0 0% 100% / 0.2) 0%, transparent 45%)',
              left: glareX,
              top: glareY,
              transform: 'translate(-50%, -50%)',
              opacity: glareOpacity,
            }}
          />
          {/* Secondary subtle sheen */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(
                135deg,
                transparent 0%,
                hsl(var(--primary) / 0.05) 50%,
                transparent 100%
              )`,
            }}
          />
        </motion.div>
      )}

      {/* Elevated content */}
      <motion.div 
        style={{ 
          transform: 'translateZ(30px)',
          transformStyle: 'preserve-3d',
        }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
