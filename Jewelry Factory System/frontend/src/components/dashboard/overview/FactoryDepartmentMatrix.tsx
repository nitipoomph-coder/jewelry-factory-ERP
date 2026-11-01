import React from 'react';
import { TableProperties } from 'lucide-react';
import type { CockpitDepartment } from '../../../services/dashboardAPI';

interface FactoryDepartmentMatrixProps {
  departments?: CockpitDepartment[];
  selectedFacility: 'ALL' | 'FBE' | 'CLL';
  activeWorkdays?: number;
}

export const FactoryDepartmentMatrix: React.FC<FactoryDepartmentMatrixProps> = ({
  departments = [],
  selectedFacility,
  activeWorkdays = 287,
}) => {
  const safeWorkdays = Math.max(activeWorkdays, 1);
  const totalFbe = departments.reduce((acc, d) => acc + (d.fbePcs || 0), 0);
  const totalCll = departments.reduce((acc, d) => acc + (d.cllPcs || 0), 0);
  const grandTotal = departments.reduce((acc, d) => acc + (d.totalPcs || 0), 0);
  const activeTotal = selectedFacility === 'FBE' ? totalFbe : (selectedFacility === 'CLL' ? totalCll : grandTotal);
  const totalDailyAvg = departments.reduce((acc, d) => {
    if (selectedFacility === 'FBE') return acc + Math.round(d.fbePcs / safeWorkdays);
    if (selectedFacility === 'CLL') return acc + Math.round(d.cllPcs / safeWorkdays);
    return acc + (d.dailyAvg || 0);
  }, 0);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-0)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-panel)',
        padding: '13px 15px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Table Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-surface-1)',
              color: 'var(--color-brand-600)',
              border: '1px solid var(--color-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TableProperties size={15} strokeWidth={2} />
          </span>
          <div>
            <div
              style={{
                fontSize: '0.80rem',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              11 Production Departments Matrix
            </div>
            <div
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--color-text-tertiary)',
              }}
            >
              {selectedFacility === 'ALL'
                ? 'Real-time Output Across All Manufacturing Lines'
                : `Department Output Breakdown (${selectedFacility} Facility)`}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.64rem',
            fontWeight: 800,
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-surface-1)',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid var(--color-border-light)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          11 Depts Active
        </span>
      </div>

      {/* Table Container */}
      <div
        className="content-scrollbar"
        style={{
          overflowX: 'auto',
          border: '1px solid var(--color-border-light)',
          borderRadius: '6px',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.73rem',
          }}
        >
          {/* Sticky Header */}
          <thead
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--color-surface-1)',
              zIndex: 2,
            }}
          >
            <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', width: '45px', whiteSpace: 'nowrap' }}>
                Code
              </th>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                Department Name
              </th>
              {selectedFacility === 'ALL' ? (
                <>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-brand-600)', width: '95px', whiteSpace: 'nowrap' }}>
                    FBE (Pcs)
                  </th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-proc-polishing, var(--color-success-600))', width: '95px', whiteSpace: 'nowrap' }}>
                    CLL (Pcs)
                  </th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)', width: '105px', whiteSpace: 'nowrap' }}>
                    Total Output
                  </th>
                </>
              ) : (
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)', width: '120px', whiteSpace: 'nowrap' }}>
                  {selectedFacility} Output (Pcs)
                </th>
              )}
              <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', width: '100px', whiteSpace: 'nowrap' }}>
                Share %
              </th>
              <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-tertiary)', width: '80px', whiteSpace: 'nowrap' }}>
                Avg / Day
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {departments.map((dept, idx) => {
              const currentPcs = selectedFacility === 'FBE' ? dept.fbePcs : (selectedFacility === 'CLL' ? dept.cllPcs : dept.totalPcs);
              const dynamicDailyAvg = Math.round(currentPcs / safeWorkdays);
              const dynamicSharePct = activeTotal > 0 ? Math.round((currentPcs / activeTotal) * 100) : 0;

              return (
                <tr
                  key={dept.code || idx}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    backgroundColor: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-brand-600) 6%, var(--color-surface-0))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)';
                  }}
                >
                  {/* Code */}
                  <td style={{ padding: '6px 10px' }}>
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        backgroundColor: 'var(--color-surface-2)',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-mono, monospace)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      {dept.code}
                    </span>
                  </td>

                  {/* Name */}
                  <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {dept.name}
                  </td>

                  {/* Facility Split */}
                  {selectedFacility === 'ALL' ? (
                    <>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: dept.fbePcs > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                        {dept.fbePcs > 0 ? dept.fbePcs.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: dept.cllPcs > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                        {dept.cllPcs > 0 ? dept.cllPcs.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {dept.totalPcs.toLocaleString()}
                      </td>
                    </>
                  ) : (
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {currentPcs.toLocaleString()}
                    </td>
                  )}

                  {/* Share % with Corporate Mini Bar */}
                  <td style={{ padding: '6px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, color: 'var(--color-text-secondary)', width: '28px', fontSize: '0.67rem' }}>
                        {dynamicSharePct}%
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '4px',
                          borderRadius: '2px',
                          backgroundColor: 'var(--color-surface-2)',
                          overflow: 'hidden',
                          minWidth: '35px',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(dynamicSharePct * 2.2, 100)}%`,
                            height: '100%',
                            backgroundColor: 'var(--color-brand-600)',
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Daily Avg */}
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    {dynamicDailyAvg.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Sticky Total Footer */}
          <tfoot
            style={{
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'var(--color-surface-1)',
              borderTop: '2px solid var(--color-border-default)',
              fontWeight: 900,
            }}
          >
            <tr>
              <td colSpan={2} style={{ padding: '7px 10px', color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Grand Total
              </td>
              {selectedFacility === 'ALL' ? (
                <>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-brand-600)' }}>
                    {totalFbe.toLocaleString()}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-proc-polishing, var(--color-success-600))' }}>
                    {totalCll.toLocaleString()}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-primary)', fontSize: '0.76rem' }}>
                    {grandTotal.toLocaleString()}
                  </td>
                </>
              ) : (
                <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-primary)', fontSize: '0.76rem' }}>
                  {activeTotal.toLocaleString()}
                </td>
              )}
              <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-secondary)' }}>
                100%
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-primary)' }}>
                {totalDailyAvg.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default FactoryDepartmentMatrix;
