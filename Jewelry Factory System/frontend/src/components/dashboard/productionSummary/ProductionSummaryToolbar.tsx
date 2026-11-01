import { PRODUCTION_STEPS, PRODUCTION_MODES, MONTH_SHORT, getYearOptions } from '../../../config/productionSummaryConfig';
import type { ProductionStep, ProductionMode } from '../../../config/productionSummaryConfig';

interface ToolbarProps {
  tab: 'year' | 'week' | 'month';
  setTab: (tab: 'year' | 'week' | 'month') => void;
  step: string;
  setStep: (step: string) => void;
  mode: string;
  setMode: (mode: string) => void;
  year: number;
  setYear: (year: number) => void;
  fromWeek: number;
  setFromWeek: (w: number) => void;
  toWeek: number;
  setToWeek: (w: number) => void;
  maxWeek: number;
  month: number;
  setMonth: (m: number) => void;
  onShow: () => void;
  onPrint: () => void;
  loading: boolean;
}

export function ProductionSummaryToolbar(props: ToolbarProps) {
  const {
    tab, setTab,
    step, setStep,
    mode, setMode,
    year, setYear,
    fromWeek, setFromWeek,
    toWeek, setToWeek,
    maxWeek,
    month, setMonth,
    onShow, onPrint,
    loading
  } = props;

  const years = getYearOptions();
  const weeks = Array.from({ length: maxWeek || 52 }, (_, i) => i + 1);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '12px',
      padding: '16px', background: 'var(--color-ui-surface)',
      borderRadius: '8px', border: '1px solid var(--color-border-light)',
      marginBottom: '16px'
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-light)' }}>
        {(['year', 'week', 'month'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--color-primary-500)' : '2px solid transparent',
              color: tab === t ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
              fontWeight: tab === t ? 800 : 500,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Production Step</label>
          <select
            value={step}
            onChange={e => setStep(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)' }}
          >
            {PRODUCTION_STEPS.map((s: ProductionStep) => (
              <option key={s.code} value={s.code}>{s.nameEN} ({s.nameTH})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Mode</label>
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)' }}
          >
            {PRODUCTION_MODES.map((m: ProductionMode) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Year</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {tab === 'week' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>From Week</label>
              <select
                value={fromWeek}
                onChange={e => setFromWeek(Number(e.target.value))}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)' }}
              >
                {weeks.map(w => <option key={w} value={w}>W{w}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>To Week</label>
              <select
                value={toWeek}
                onChange={e => setToWeek(Number(e.target.value))}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)' }}
              >
                {weeks.map(w => <option key={w} value={w}>W{w}</option>)}
              </select>
            </div>
          </>
        )}

        {tab === 'month' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', background: 'var(--color-ui-surface)', color: 'var(--color-text-primary)' }}
            >
              {MONTH_SHORT.map((m: string, i: number) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onShow}
            disabled={loading}
            style={{
              padding: '6px 16px',
              background: 'var(--color-ui-interactive)',
              color: 'var(--color-ui-on-interactive)',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Loading...' : 'Show / Display'}
          </button>

          <button
            onClick={onPrint}
            style={{
              padding: '6px 16px',
              background: 'var(--color-ui-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '4px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Print
          </button>
        </div>

      </div>
    </div>
  );
}
