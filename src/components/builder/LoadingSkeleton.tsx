"use client";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className ?? ""}`}
    />
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Player Info skeleton */}
      <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Pulse className="h-6 w-48" />
          <Pulse className="h-4 w-32" />
          <div className="flex gap-1.5 mt-2">
            <Pulse className="h-5 w-16" />
            <Pulse className="h-5 w-20" />
          </div>
        </div>
        <Pulse className="h-10 w-16 shrink-0" />
      </div>

      {/* Archetype skeleton */}
      <div className="bg-card border border-border rounded-lg p-4">
        <Pulse className="h-4 w-20 mb-2" />
        <Pulse className="h-10 w-full" />
      </div>

      {/* Next Action skeleton */}
      <div className="bg-card border-2 border-border rounded-lg p-5">
        <Pulse className="h-5 w-32 mb-2" />
        <Pulse className="h-6 w-64 mb-1" />
        <Pulse className="h-4 w-48" />
      </div>

      {/* Stat Grid skeleton */}
      <div className="bg-card border border-border rounded-lg p-4">
        <Pulse className="h-4 w-24 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
          {[1, 2, 3].map((col) => (
            <div key={col} className="space-y-2">
              <Pulse className="h-4 w-20 mb-2" />
              {[1, 2, 3, 4].map((row) => (
                <Pulse key={row} className="h-7 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
