import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight, ExternalLink, ShieldAlert } from 'lucide-react';
import type { CockpitOverdueOrder, CockpitCustomerShare } from '../../../services/dashboardAPI';

interface FactoryRiskPanelProps {
  overdueOrders?: CockpitOverdueOrder[];
  customerShare?: CockpitCustomerShare[];
}

export const FactoryRiskPanel: React.FC<FactoryRiskPanelProps> = ({
  overdueOrders = [],
  customerShare = [],
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overdue' | 'customers'>('overdue');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

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
      {/* Panel Header with Segmented Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border-light)',
          paddingBottom: '9px',
          marginBottom: '9px',
        }}
      >
        {/* Tab Buttons */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-surface-1)',
            borderRadius: '6px',
            padding: '2px',
            gap: '2px',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('overdue')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 11px',
              borderRadius: '5px',
              fontSize: '0.73rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: activeTab === 'overdue'
                ? '1px solid var(--color-border-default)'
                : '1px solid transparent',
              backgroundColor: activeTab === 'overdue' ? 'var(--color-surface-0)' : 'transparent',
              color: activeTab === 'overdue' ? 'var(--color-danger-500)' : 'var(--color-text-secondary)',
              boxShadow: activeTab === 'overdue' ? '0 1px 3px color-mix(in srgb, var(--color-surface-800) 6%, transparent)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldAlert size={13} />
            <span>Critical Overdue</span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'color-mix(in srgb, var(--color-danger-500) 10%, var(--color-surface-0))',
                color: 'var(--color-danger-500)',
                fontFamily: 'var(--font-mono, monospace)',
                border: '1px solid color-mix(in srgb, var(--color-danger-500) 25%, transparent)',
              }}
            >
              {overdueOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 11px',
              borderRadius: '5px',
              fontSize: '0.73rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: activeTab === 'customers'
                ? '1px solid var(--color-border-default)'
                : '1px solid transparent',
              backgroundColor: activeTab === 'customers' ? 'var(--color-surface-0)' : 'transparent',
              color: activeTab === 'customers' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
              boxShadow: activeTab === 'customers' ? '0 1px 3px color-mix(in srgb, var(--color-surface-800) 6%, transparent)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={13} />
            <span>Customer Volume</span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-mono, monospace)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              Top 5
            </span>
          </button>
        </div>

        {/* Action Link */}
        {activeTab === 'overdue' ? (
          <button
            type="button"
            onClick={() => navigate('/po-tracker')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.70rem',
              fontWeight: 800,
              color: 'var(--color-brand-600)',
              backgroundColor: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-light)',
              padding: '4px 10px',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-1)';
            }}
          >
            <span>Open PO Tracker</span>
            <ArrowRight size={11} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/dashboard/customer')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.70rem',
              fontWeight: 800,
              color: 'var(--color-brand-600)',
              backgroundColor: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-light)',
              padding: '4px 10px',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-1)';
            }}
          >
            <span>Sales Dashboard</span>
            <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* ── Content View ── */}
      {activeTab === 'overdue' ? (
        <div
          key="overdue-tab"
          className="content-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
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
            <thead
              style={{
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--color-surface-1)',
                zIndex: 1,
              }}
            >
              <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Order No</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Customer</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>Due Date</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-danger-500)', whiteSpace: 'nowrap', minWidth: '90px' }}>Delay Status</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', minWidth: '70px' }}>Qty (Pcs)</th>
              </tr>
            </thead>
            <tbody>
              {overdueOrders.map((ord, idx) => (
                <tr
                  key={ord.ordNo || idx}
                  onClick={() => navigate(`/po-tracker/${ord.ordNo}`)}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    backgroundColor: idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-danger-500) 6%, var(--color-surface-0))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'var(--color-surface-0)' : 'var(--color-surface-1)';
                  }}
                >
                  <td style={{ padding: '6px 10px', fontWeight: 900, color: 'var(--color-brand-600)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                    {ord.ordNo}
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border-light)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.67rem',
                      }}
                    >
                      {ord.custCode}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDate(ord.dueDate)}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        backgroundColor: 'color-mix(in srgb, var(--color-danger-500) 10%, var(--color-surface-0))',
                        color: 'var(--color-danger-500)',
                        border: '1px solid color-mix(in srgb, var(--color-danger-500) 25%, transparent)',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      +{ord.delayDays}d
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                    {ord.qty?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          key="customers-tab"
          className="content-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            justifyContent: 'flex-start',
          }}
        >
          {customerShare.map((cust, idx) => (
            <div
              key={cust.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.73rem',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-light)',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-0)';
                e.currentTarget.style.borderColor = 'var(--color-border-default)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-1)';
                e.currentTarget.style.borderColor = 'var(--color-border-light)';
              }}
            >
              {/* Rank Number */}
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '3px',
                  fontSize: '0.60rem',
                  fontWeight: 900,
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono, monospace)',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>

              {/* Cust Code */}
              <span
                style={{
                  width: '42px',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--color-brand-600)',
                }}
              >
                {cust.code}
              </span>

              {/* Cust Name */}
              <span
                style={{
                  flex: '0 1 180px',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={cust.name}
              >
                {cust.name}
              </span>

              {/* Progress Bar */}
              <div
                style={{
                  flex: 1,
                  height: '5px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-surface-2)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(cust.sharePct * 2.5, 100)}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-brand-600)',
                    borderRadius: '2px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Share % */}
              <span
                style={{
                  width: '40px',
                  textAlign: 'right',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.68rem',
                }}
              >
                {cust.sharePct}%
              </span>

              {/* Pcs */}
              <span
                style={{
                  width: '80px',
                  textAlign: 'right',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {cust.qty.toLocaleString()} pcs
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FactoryRiskPanel;
