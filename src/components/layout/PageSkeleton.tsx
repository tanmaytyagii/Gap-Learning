import { Skeleton } from '../ui/misc';

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="mt-4 h-72 rounded-xl" />
    </div>
  );
}
