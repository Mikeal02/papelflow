import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface EliteSkeletonProps {
  className?: string;
  variant?: 'default' | 'text' | 'circle' | 'card' | 'stat';
}

export function EliteSkeleton({ className, variant = 'default' }: EliteSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/40",
        variant === 'circle' && "rounded-full",
        variant === 'text' && "h-4 rounded-md",
        variant === 'card' && "rounded-xl min-h-[120px]",
        className,
      )}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.06), transparent)',
        }}
        animate={{ translateX: ['-100%', '100%'] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <EliteSkeleton variant="text" className="w-20 h-3" />
          <EliteSkeleton variant="text" className="w-32 h-7" />
          <div className="flex gap-2 mt-1">
            <EliteSkeleton className="w-16 h-5 rounded-full" />
            <EliteSkeleton className="w-12 h-5 rounded-full" />
          </div>
        </div>
        <EliteSkeleton className="h-14 w-14 rounded-2xl flex-shrink-0" />
      </div>
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg">
      <EliteSkeleton variant="circle" className="h-10 w-10 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <EliteSkeleton variant="text" className="w-28 h-4" />
        <EliteSkeleton variant="text" className="w-20 h-3" />
      </div>
      <EliteSkeleton variant="text" className="w-16 h-4" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="stat-card p-5 space-y-4">
      <div className="flex justify-between items-center">
        <EliteSkeleton variant="text" className="w-32 h-5" />
        <EliteSkeleton className="w-20 h-8 rounded-lg" />
      </div>
      <div className="flex items-end gap-1.5 h-32">
        {Array.from({ length: 12 }).map((_, i) => (
          <EliteSkeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + Math.random() * 70}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="space-y-2">
        <EliteSkeleton variant="text" className="w-48 h-8" />
        <EliteSkeleton variant="text" className="w-64 h-4" />
      </div>

      {/* Quick add */}
      <EliteSkeleton className="w-full h-14 rounded-2xl" />

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <EliteSkeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Main content */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="stat-card p-5 space-y-3">
            <div className="flex justify-between">
              <EliteSkeleton variant="text" className="w-40 h-5" />
              <EliteSkeleton className="w-16 h-8 rounded-lg" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <TransactionRowSkeleton key={i} />
            ))}
          </div>
          <ChartSkeleton />
        </div>
        <div className="space-y-5">
          <EliteSkeleton variant="card" className="h-48" />
          <EliteSkeleton variant="card" className="h-36" />
          <EliteSkeleton variant="card" className="h-44" />
        </div>
      </div>
    </div>
  );
}
