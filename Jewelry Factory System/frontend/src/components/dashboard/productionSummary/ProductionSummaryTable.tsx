// src/components/dashboard/productionSummary/ProductionSummaryTable.tsx
import { PROD_CUSTOMER_GROUPS } from '../../../config/productionSummaryConfig';
import type { ProdCustomerGroup } from '../../../config/productionSummaryConfig';

export interface ProductionSummaryRow {
  N008?: number;
  N098?: number;
  N051?: number;
  total?: number;
  workDays?: number;
  avg?: number;
  period?: string | number;
  periodLabel?: string;
  [key: string]: unknown;
}

interface TableProps {
  data: ProductionSummaryRow[];
  tab: 'year' | 'week' | 'month' | 'day';
}

export function ProductionSummaryTable({ data, tab }: TableProps) {
  if (!data || data.length === 0) return null;

  const isDaily = tab === 'month' || tab === 'day';
  const totalCols = data.length;

  // คำนวณยอดรวม TOTAL
  const totals = {
    N008: 0,
    N098: 0,
    N051: 0,
    total: 0,
    workDays: 0,
  };

  data.forEach((d) => {
    totals.N008 += d.N008 || 0;
    totals.N098 += d.N098 || 0;
    totals.N051 += d.N051 || 0;
    totals.total += d.total || 0;
    totals.workDays += d.workDays || 0;
  });

  const avgTotal = totals.workDays > 0 ? totals.total / totals.workDays : 0;

  const renderCell = (val: unknown) => {
    if (val == null) return '-';
    const num = Number(val);
    if (isNaN(num) || num === 0) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  // ปรับSizeฟอนต์AutoตามQtyคอลัมน์ (ยิ่งวันเยอะ ยิ่งปรับฟอนต์ให้กะทัดรัด)
  const cellFontSize = totalCols > 25 ? '11px' : totalCols > 15 ? '12px' : '13px';

  return (
    <div
      style={{
        width: '100%',
        background: 'var(--color-ui-surface)',
        borderRadius: '6px',
        border: '1px solid var(--color-border-light)',
        overflow: 'hidden', // ล็อกไม่ให้มี Scrollbar แนวนอน
      }}
    >
      <table
        style={{
          width: '100%',
          tableLayout: 'fixed', // 👈 บังคับเฉลี่ยคอลัมน์เป๊ะ 100% ไม่ล้นจอ
          borderCollapse: 'collapse',
          fontSize: cellFontSize,
          fontVariantNumeric: 'tabular-nums', // 👈 ตัวเลขหน้ากว้างเท่ากัน อ่านง่าย
          textAlign: 'center',
        }}
      >
        <thead>
          <tr
            style={{
              background: 'var(--color-table-header)',
              borderBottom: '1.5px solid var(--color-border-strong)',
              color: 'var(--color-text-primary)',
              height: isDaily ? '32px' : '26px',
            }}
          >
            {/* คอลัมน์แรก: ชื่อกลุ่ม (ความกว้างคงที่) */}
            <th
              style={{
                width: totalCols > 25 ? '75px' : '95px',
                padding: '4px 6px',
                textAlign: 'center',
                borderRight: '1px solid var(--color-border-light)',
                fontWeight: 700,
              }}
            >

            </th>

            {/* คอลัมน์ข้อมูล (เฉลี่ยความกว้างเท่ากันAll) */}
            {data.map((d) => {
              // ในโหมด Month/Day แสดงหัวตารางเป็น dd/MM e.g. "01/09", "02/09" .. "31/09"
              const headerLabel = isDaily && d.periodLabel?.includes('/')
                ? (() => {
                    const parts = d.periodLabel.split('/');
                    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
                  })()
                : d.periodLabel || d.period;

              return (
                <th
                  key={d.period}
                  title={d.periodLabel}
                  style={{
                    padding: '4px 2px',
                    textAlign: 'center',
                    borderRight: '1px solid var(--color-border-light)',
                    fontWeight: 600,
                    fontSize: totalCols > 25 ? '9px' : undefined,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {headerLabel}
                </th>
              );
            })}

            {/* คอลัมน์สุดท้าย: TOTAL / Avg (ความกว้างคงที่) */}
            <th
              style={{
                width: isDaily ? '85px' : '75px',
                padding: '4px 6px',
                textAlign: 'center',
                fontWeight: 700,
                color: 'var(--color-danger-600)',
              }}
            >
              {isDaily ? (
                <div style={{ lineHeight: '1.1', fontSize: '9.5px' }}>
                  <span>{totals.workDays} ({data.length}) Days</span>
                  <br />
                  <span style={{ fontSize: '10px', fontWeight: 800 }}>Avg.</span>
                </div>
              ) : (
                'TOTAL'
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {/* แถว 3 กลุ่มCustomer */}
          {PROD_CUSTOMER_GROUPS.map((g: ProdCustomerGroup) => (
            <tr
              key={g.id}
              style={{
                borderBottom: '1px solid var(--color-border-light)',
                height: '30px',
              }}
            >
              <td
                style={{
                  padding: '4px 6px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: g.color,
                  borderRight: '1px solid var(--color-border-light)',
                }}
              >
                {g.id}
              </td>

              {data.map((d) => (
                <td
                  key={d.period}
                  style={{
                    padding: '4px 4px',
                    borderRight: '1px solid var(--color-border-light)',
                  }}
                >
                  {renderCell(d[g.id])}
                </td>
              ))}

              <td
                style={{
                  padding: '4px 8px',
                  fontWeight: 700,
                  textAlign: 'center',
                  color: 'var(--color-text-primary)',
                }}
              >
                {isDaily
                  ? renderCell(
                    totals.workDays > 0
                      ? totals[g.id as keyof typeof totals] / totals.workDays
                      : 0
                  )
                  : renderCell(totals[g.id as keyof typeof totals])}
              </td>
            </tr>
          ))}

          {/* แถว Total (พื้นหลังสีฟ้าอ่อน) */}
          <tr
            style={{
              background: 'var(--color-prod-total-row-bg)',
              borderBottom: '1px solid var(--color-border-light)',
              height: '30px',
            }}
          >
            <td
              style={{
                padding: '4px 8px',
                textAlign: 'center',
                fontWeight: 800,
                color: 'var(--color-chart-1)',
                borderRight: '1px solid var(--color-border-light)',
              }}
            >
              Total
            </td>

            {data.map((d) => (
              <td
                key={d.period}
                style={{
                  padding: '4px 4px',
                  fontWeight: 700,
                  borderRight: '1px solid var(--color-border-light)',
                }}
              >
                {renderCell(d.total)}
              </td>
            ))}

            <td
              style={{
                padding: '4px 8px',
                fontWeight: 800,
                textAlign: 'center',
                color: 'var(--color-chart-1)',
              }}
            >
              {isDaily ? renderCell(avgTotal) : renderCell(totals.total)}
            </td>
          </tr>

          {/* แถว Avg. (เฉพาะโหมด Year and Week - พื้นหลังสีม่วงอ่อน) */}
          {!isDaily && (
            <tr
              style={{
                background: 'var(--color-prod-avg-row-bg)',
                height: '30px',
              }}
            >
              <td
                style={{
                  padding: '4px 6px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: 'var(--color-chart-2)',
                  borderRight: '1px solid var(--color-border-light)',
                  lineHeight: '1.1',
                }}
              >
                Avg / Day
              </td>

              {data.map((d) => (
                <td
                  key={d.period}
                  style={{
                    padding: '4px 4px',
                    fontWeight: 700,
                    borderRight: '1px solid var(--color-border-light)',
                  }}
                >
                  {renderCell(d.avg)}
                </td>
              ))}

              <td
                style={{
                  padding: '4px 8px',
                  fontWeight: 800,
                  textAlign: 'center',
                  color: 'var(--color-chart-2)',
                }}
              >
                {renderCell(avgTotal)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
