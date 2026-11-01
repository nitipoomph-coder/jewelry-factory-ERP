export function TopOrdersSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>


      {/* 1. Summary Header Skeleton (เลียนแบบแถบด้านบน) */}
      <div
        style={{
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          borderBottom: "1px solid var(--color-border-light)",
          background: "var(--color-surface-0)",
        }}
      >
        {/* ซ้าย: ชื่อหัวข้อandDetails */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div className="app-skeleton" style={{ height: "20px", width: "130px", borderRadius: "6px" }} />
            <div className="app-skeleton" style={{ height: "20px", width: "160px", borderRadius: "6px" }} />
          </div>
          <div className="app-skeleton" style={{ height: "14px", width: "320px" }} />
        </div>

        {/* ขวา: กล่อง KPI 3 กล่อง Ratio 1fr 1fr 2fr (Volume, Value, Top Product Type) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 2fr",
            gap: 12,
            alignItems: "stretch",
            flex: 1,
            minWidth: "min(100%, 740px)",
            maxWidth: 1060,
          }}
        >
          {/* Card 1: 1fr (Volume) */}
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border-light)",
              minWidth: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <div>
              <div className="app-skeleton" style={{ height: "12px", width: "70px" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <div className="app-skeleton" style={{ height: "24px", width: "80px", borderRadius: "6px" }} />
                <div className="app-skeleton" style={{ height: "12px", width: "24px" }} />
              </div>
            </div>
            <div className="app-skeleton" style={{ height: "10px", width: "110px", marginTop: 4 }} />
          </div>

          {/* Card 2: 1fr (Value) */}
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border-light)",
              minWidth: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <div>
              <div className="app-skeleton" style={{ height: "12px", width: "65px" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <div className="app-skeleton" style={{ height: "24px", width: "95px", borderRadius: "6px" }} />
              </div>
            </div>
            <div className="app-skeleton" style={{ height: "10px", width: "120px", marginTop: 4 }} />
          </div>

          {/* Card 3: 2fr (Top Product Type with segmented bar and 4 legend dots) */}
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border-light)",
              minWidth: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <div>
              <div className="app-skeleton" style={{ height: "12px", width: "95px" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <div className="app-skeleton" style={{ height: "24px", width: "125px", borderRadius: "6px" }} />
                <div className="app-skeleton" style={{ height: "12px", width: "65px" }} />
              </div>
            </div>

            {/* Segmented bar placeholder */}
            <div
              className="app-skeleton"
              style={{ width: "100%", height: 6, borderRadius: 3, marginTop: 6, marginBottom: 4 }}
            />

            {/* 4 Legend dots placeholder */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", rowGap: 2 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <div className="app-skeleton" style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0 }} />
                <div className="app-skeleton" style={{ height: "10px", width: "75px" }} />
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <div className="app-skeleton" style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0 }} />
                <div className="app-skeleton" style={{ height: "10px", width: "65px" }} />
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <div className="app-skeleton" style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0 }} />
                <div className="app-skeleton" style={{ height: "10px", width: "55px" }} />
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <div className="app-skeleton" style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0 }} />
                <div className="app-skeleton" style={{ height: "10px", width: "50px" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Gallery Grid Skeleton (ส่วนการ์ดสินค้า) */}
      <div className="gallery-grid" style={{ padding: "16px 20px" }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="gallery-loading-card"
            style={{
              background: "var(--color-surface-0)",
              borderRadius: 12,
              padding: "16px",
              border: "1px solid var(--color-border-light)",
              display: "flex",
              flexDirection: "column",
              minHeight: "280px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {/* Header Row */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div className="app-skeleton" style={{ height: "12px", width: "40%" }} />
              <div className="app-skeleton" style={{ height: "12px", width: "15%" }} />
            </div>

            {/* Image Area & Dimensions */}
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              paddingBottom: "16px"
            }}>
              <div
                className="app-skeleton"
                style={{ margin: "auto", width: "50%", height: "40px", borderRadius: "20px", opacity: 0.6 }}
              />
              <div className="app-skeleton" style={{ height: "10px", width: "25%", marginTop: "auto" }} />
            </div>

            {/* Footer Row 1 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
              <div className="app-skeleton" style={{ height: "16px", width: "35%", borderRadius: "6px" }} />
              <div className="app-skeleton" style={{ height: "16px", width: "30%", borderRadius: "6px" }} />
            </div>

            {/* Footer Row 2 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="app-skeleton" style={{ height: "12px", width: "25%" }} />
              <div className="app-skeleton" style={{ height: "12px", width: "45%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}