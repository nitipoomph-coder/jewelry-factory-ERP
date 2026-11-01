export function FBEOrderTrackSkeleton() {
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-0 overflow-hidden" aria-busy="true" aria-label="Loading order tracking data">
      {/* Left Column (~75%) */}
      <div className="lg:col-span-9 flex flex-col gap-2 min-h-0 overflow-hidden">
        {/* 1. Order Info Skeleton */}
        <section
          className="flex-shrink-0"
          style={{
            background: 'var(--color-ui-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-default)] mb-2">
            <div className="app-skeleton" style={{ width: 180, height: 16, borderRadius: 4 }} />
            <div className="app-skeleton" style={{ width: 120, height: 16, borderRadius: 4 }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((__, rowIdx) => (
                  <div key={rowIdx} className="flex justify-between items-center gap-2">
                    <div className="app-skeleton" style={{ width: '40%', height: 12, borderRadius: 3 }} />
                    <div className="app-skeleton" style={{ width: '45%', height: 12, borderRadius: 3 }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* 2. Step Timeline Skeleton (17 Steps) */}
        <section
          className="flex-1 overflow-hidden flex flex-col gap-2 p-3"
          style={{
            background: 'var(--color-ui-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 8,
          }}
        >
          <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border-default)]">
            <div className="app-skeleton" style={{ width: 140, height: 16, borderRadius: 4 }} />
            <div className="app-skeleton" style={{ width: 90, height: 14, borderRadius: 4 }} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-2 overflow-y-auto">
            {Array.from({ length: 17 }).map((_, stepIdx) => (
              <div
                key={stepIdx}
                className="p-2 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-1)] flex flex-col gap-1.5"
              >
                <div className="flex justify-between items-center">
                  <div className="app-skeleton" style={{ width: 18, height: 14, borderRadius: 2 }} />
                  <div className="app-skeleton" style={{ width: 26, height: 14, borderRadius: 8 }} />
                </div>
                <div className="app-skeleton" style={{ width: '80%', height: 12, borderRadius: 2 }} />
                <div className="app-skeleton" style={{ width: '50%', height: 10, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        </section>

        {/* 3. History Table Skeleton */}
        <section
          className="flex-shrink-0 p-3"
          style={{
            height: 140,
            background: 'var(--color-ui-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 8,
          }}
        >
          <div className="app-skeleton mb-2" style={{ width: 120, height: 14, borderRadius: 3 }} />
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                {Array.from({ length: 6 }).map((__, j) => (
                  <div key={j} className="app-skeleton flex-1" style={{ height: 16, borderRadius: 2 }} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Column (~25%): Photo + Detail */}
      <div className="lg:col-span-3 flex flex-col gap-2 min-h-0">
        <div
          className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-ui-surface)] p-3 flex flex-col items-center justify-center gap-3"
          style={{ height: 260 }}
        >
          <div className="app-skeleton w-40 h-40" style={{ borderRadius: 8 }} />
          <div className="app-skeleton w-28 h-4" style={{ borderRadius: 3 }} />
        </div>
        <div
          className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-ui-surface)] p-3 flex flex-col gap-2"
        >
          <div className="app-skeleton" style={{ width: 100, height: 14, borderRadius: 3 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-1 border-b border-[var(--color-border-light)]/40">
              <div className="app-skeleton" style={{ width: '45%', height: 12, borderRadius: 2 }} />
              <div className="app-skeleton" style={{ width: '35%', height: 12, borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
