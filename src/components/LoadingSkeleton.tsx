export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton-line ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 animate-pulse">
      <SkeletonLine className="h-5 w-3/4 mb-3" />
      <SkeletonLine className="h-4 w-1/2 mb-6" />
      <div className="flex gap-4">
        <SkeletonLine className="h-10 flex-1" />
        <SkeletonLine className="h-10 flex-1" />
      </div>
    </div>
  );
}
