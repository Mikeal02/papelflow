import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glareEnabled?: boolean;
  borderGlow?: boolean;
}

export const TiltCard = ({
  children,
  className,
  intensity = 15,
  glareEnabled = true,
  borderGlow = true,
}: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${intensity}deg`, `-${intensity}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${intensity}deg`, `${intensity}deg`]);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['0%', '100%']);

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

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={cn(
        'relative rounded-2xl transition-shadow duration-300',
        isHovered && borderGlow && 'shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]',
        className
      )}
    >
      {/* Border glow effect */}
      {borderGlow && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, 
              hsl(var(--primary) / ${isHovered ? 0.3 : 0}) 0%, 
              hsl(var(--accent) / ${isHovered ? 0.2 : 0}) 50%,
              hsl(var(--primary) / ${isHovered ? 0.1 : 0}) 100%)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Glare effect */}
      {glareEnabled && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
          style={{
            opacity: isHovered ? 0.15 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          <motion.div
            className="absolute w-[200%] h-[200%]"
            style={{
              background: 'radial-gradient(circle, white 0%, transparent 50%)',
              left: glareX,
              top: glareY,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </motion.div>
      )}

      {/* Content */}
      <div style={{ transform: 'translateZ(50px)' }}>{children}</div>
    </motion.div>
  );
};
