import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  rotationSpeed: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--income))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-6))',
];

export const useConfetti = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  const fire = (origin: { x: number; y: number } = { x: 0.5, y: 0.5 }) => {
    const newParticles: Particle[] = [];
    const count = 60;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const velocity = 8 + Math.random() * 12;
      
      newParticles.push({
        id: Date.now() + i,
        x: origin.x * 100,
        y: origin.y * 100,
        rotation: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 6,
        velocity: {
          x: Math.cos(angle) * velocity,
          y: Math.sin(angle) * velocity - 5,
        },
        rotationSpeed: (Math.random() - 0.5) * 20,
      });
    }

    setParticles(newParticles);
    setIsActive(true);

    setTimeout(() => {
      setIsActive(false);
      setParticles([]);
    }, 3000);
  };

  return { fire, particles, isActive };
};

interface ConfettiProps {
  particles: Particle[];
  isActive: boolean;
}

export const Confetti = ({ particles, isActive }: ConfettiProps) => {
  const [animatedParticles, setAnimatedParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive || particles.length === 0) {
      setAnimatedParticles([]);
      return;
    }

    setAnimatedParticles(particles);

    const gravity = 0.3;
    const friction = 0.98;

    const interval = setInterval(() => {
      setAnimatedParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocity.x * 0.1,
            y: p.y + p.velocity.y * 0.1,
            rotation: p.rotation + p.rotationSpeed,
            velocity: {
              x: p.velocity.x * friction,
              y: p.velocity.y * friction + gravity,
            },
          }))
          .filter((p) => p.y < 150)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [particles, isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {animatedParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0.8, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                position: 'absolute',
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                transform: `rotate(${particle.rotation}deg)`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

// Celebration burst for achievements
export const CelebrationBurst = ({ trigger }: { trigger: boolean }) => {
  const { fire, particles, isActive } = useConfetti();

  useEffect(() => {
    if (trigger) {
      fire({ x: 0.5, y: 0.3 });
    }
  }, [trigger]);

  return <Confetti particles={particles} isActive={isActive} />;
};
