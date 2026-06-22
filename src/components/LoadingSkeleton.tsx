export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton-line ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <SkeletonLine className="h-5 w-3/4" />
      <SkeletonLine className="h-4 w-1/2" />
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <SkeletonLine className="h-10 flex-1" />
        <SkeletonLine className="h-10 flex-1" />
      </div>
    </div>
  );
}
