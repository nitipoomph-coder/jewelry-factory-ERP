export function ProductionForecastSkeleton() {
  return (
    <div className="flex flex-col h-full gap-2 min-h-0" aria-busy="true" aria-label="Loading production forecast">
      {/* Chart Skeleton Box */}
      <div
        className="bg-[var(--color-ui-surface)] p-4 rounded-md border border-[var(--color-border-default)] shadow-[var(--shadow-panel)] shrink-0 flex flex-col gap-4"
        style={{ height: 420 }}
      >
        <div className="flex justify-between items-center">
          <div className="app-skeleton" style={{ width: 220, height: 20, borderRadius: 4 }} />
          <div className="flex gap-4">
            <div className="app-skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
            <div className="app-skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
          </div>
        </div>

        {/* Chart Bars Skeleton */}
        <div className="flex-1 flex items-end justify-between gap-3 px-4 pb-4 border-b border-[var(--color-border-light)]">
          {[45, 70, 55, 85, 40, 90, 65, 80, 50, 75, 95, 60, 50, 85, 65, 40].map((heightPct, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div
                className="app-skeleton w-full"
                style={{
                  height: `${heightPct}%`,
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.85
                }}
              />
              <div className="app-skeleton" style={{ width: '80%', height: 10, borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="flex-1 overflow-hidden rounded-md border border-[var(--color-border-default)] bg-[var(--color-ui-surface)] p-3 flex flex-col gap-2.5">
        <div className="flex gap-3 pb-2 border-b border-[var(--color-border-light)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="app-skeleton flex-1" style={{ height: 24, borderRadius: 4 }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-3 py-1.5 border-b border-[var(--color-border-light)]/50">
            {Array.from({ length: 8 }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="app-skeleton flex-1"
                style={{
                  height: 18,
                  borderRadius: 3,
                  opacity: 0.75 + (colIdx % 3) * 0.1
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
