import { cn } from "@/lib/utils";

interface EliteSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'default' | 'text' | 'circle' | 'card' | 'stat';
}

export function EliteSkeleton({ className, variant = 'default', style, ...props }: EliteSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/40 skeleton-shimmer",
        variant === 'circle' && "rounded-full",
        variant === 'text' && "h-4 rounded-md",
        variant === 'card' && "rounded-xl min-h-[120px]",
        className,
      )}
      style={style}
      {...props}
    />
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
        <EliteSkeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
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
        <EliteSkeleton variant="text" className="w-36 h-4" />
        <EliteSkeleton variant="text" className="w-56 h-8" />
      </div>

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

export function RouteLoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-2xl bg-primary/10 border border-primary/20 animate-spin" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 border-t-primary animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
          <div className="absolute inset-2 rounded-lg bg-primary/20 animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
