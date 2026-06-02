interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`bg-border/40 rounded-md animate-pulse ${className}`} />;
}

export function CardSkeleton({ className = '' }: SkeletonProps) {
  return <div className={`bg-surface border border-border rounded-2xl animate-pulse ${className}`} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between items-center p-4 border-b border-border last:border-0">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-20 ml-4" />
        </div>
      ))}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 ${count === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3 md:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5 md:space-y-6">
      <Skeleton className="h-8 w-48" />
      <StatCardsSkeleton count={4} />
      <CardSkeleton className="h-48" />
      <ListSkeleton rows={5} />
    </div>
  );
}
