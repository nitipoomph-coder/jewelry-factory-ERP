import { useState } from 'react';
import { X, Search, Layers, RotateCcw } from 'lucide-react';
import { ORDER_DETAIL_COLUMNS, COLUMN_GROUP_PRESETS, type ColumnPreset, type ColGroup } from '../../config/orderDetailColumns';

const TOGGLEABLE_GROUPS: { group: ColGroup; label: string }[] = [
  { group: 'info', label: 'Item & Dates' },
  { group: 'sales', label: 'Sales & Shipping' },
  { group: 'production', label: 'Production' },
  { group: 'remark', label: 'Remarks' },
];

interface OrderDetailCustomViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVisibleKeys: string[];
  initialPreset: ColumnPreset;
  onApply: (keys: string[]) => void;
}

export default function OrderDetailCustomViewModal({ isOpen, onClose, initialVisibleKeys, initialPreset, onApply }: OrderDetailCustomViewModalProps) {
  if (!isOpen) return null;

  const resetKey = `${initialPreset}:${initialVisibleKeys.join('|')}`;
  return (
    <CustomViewModalContent
      key={resetKey}
      isOpen={isOpen}
      onClose={onClose}
      initialVisibleKeys={initialVisibleKeys}
      initialPreset={initialPreset}
      onApply={onApply}
    />
  );
}

function CustomViewModalContent({ onClose, initialVisibleKeys, initialPreset, onApply }: OrderDetailCustomViewModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialVisibleKeys);
  const [searchCol, setSearchCol] = useState('');

  const defaultCols = COLUMN_GROUP_PRESETS[initialPreset] || COLUMN_GROUP_PRESETS['Production'];
  const isDefault = selectedKeys.length === defaultCols.length && selectedKeys.every(k => defaultCols.includes(k));

  const handleToggleKey = (key: string) => {
    setSelectedKeys(prev => {
      return prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
    });
  };

  const handleResetDefault = () => {
    setSelectedKeys(defaultCols);
  };

  const handleApply = () => {
    onApply(selectedKeys);
    onClose();
  };

  const filteredGroups = TOGGLEABLE_GROUPS.map(g => {
    const keys = ORDER_DETAIL_COLUMNS.filter(c => c.group === g.group && (!searchCol || c.label.toLowerCase().includes(searchCol.toLowerCase()))).map(c => c.key);
    return { ...g, keys };
  }).filter(g => g.keys.length > 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-overlay-scrim-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div
        className="animate-fade-in-up"
        style={{
          background: 'var(--color-surface-0)',
          borderRadius: '8px',
          width: '100%', maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-modal)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'var(--color-brand-100)', color: 'var(--color-brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Custom View Builder</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>Select and customize columns to display in your order details.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'var(--color-surface-1)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-tertiary)' }} className="hover:bg-surface-2 hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {/* Body — Full width Columns view */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Choose Columns</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Preset: <strong style={{ color: 'var(--color-brand-600)' }}>{initialPreset}</strong></p>
            </div>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-quaternary)' }} />
              <input
                placeholder="Search columns..."
                value={searchCol}
                onChange={e => setSearchCol(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px',
                  border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)',
                  fontSize: '0.82rem', outline: 'none'
                }}
                className="focus:border-brand-500"
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
            {filteredGroups.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>No columns found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredGroups.map(g => {
                  const allSelected = g.keys.every(k => selectedKeys.includes(k));
                  return (
                    <div key={g.label} style={{ background: 'var(--color-surface-1)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g.label}</h4>
                        <button
                          type="button"
                          onClick={() => {
                            if (allSelected) {
                              setSelectedKeys(prev => prev.filter(k => !g.keys.includes(k)));
                            } else {
                              setSelectedKeys(prev => Array.from(new Set([...prev, ...g.keys])));
                            }
                          }}
                          style={{ border: 'none', background: 'transparent', color: 'var(--color-brand-600)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                          className="hover:underline"
                        >
                          {allSelected ? 'Unselect All' : 'Select All'}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                        {g.keys.map(key => {
                          const colDef = ORDER_DETAIL_COLUMNS.find(c => c.key === key);
                          const isSelected = selectedKeys.includes(key);
                          return (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', background: isSelected ? 'var(--color-brand-50)' : 'var(--color-surface-0)', border: `1px solid ${isSelected ? 'var(--color-brand-200)' : 'transparent'}`, transition: 'all 0.15s ease' }} className="hover:bg-surface-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleKey(key)}
                                style={{ accentColor: 'var(--color-brand-500)', width: '15px', height: '15px', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '0.82rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--color-brand-700)' : 'var(--color-text-primary)' }}>
                                {colDef?.label || key}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-1)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
              <strong style={{ color: 'var(--color-brand-600)' }}>{selectedKeys.length}</strong> columns selected
            </span>
            <button
              type="button"
              onClick={handleResetDefault}
              disabled={isDefault}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-strong)',
                background: 'var(--color-surface-0)',
                color: isDefault ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: isDefault ? 'not-allowed' : 'pointer',
                opacity: isDefault ? 0.5 : 1,
                transition: 'all 0.15s ease'
              }}
              className={!isDefault ? "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] active:scale-95" : ""}
              title="Restore default columns for this preset"
            >
              <RotateCcw size={13} />
              Reset to Default
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
              className="hover:bg-surface-2 hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: 'var(--color-brand-500)', color: 'var(--color-ui-on-interactive)', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
              className="hover:bg-brand-600"
            >
              Apply View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
