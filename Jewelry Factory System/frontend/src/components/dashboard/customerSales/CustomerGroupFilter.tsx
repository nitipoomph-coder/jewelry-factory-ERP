import { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { ALL_GROUPS } from '../../../config/customerGroups';

interface CustomerGroupFilterProps {
  selGroups: string[];
  setSelGroups: (groups: string[]) => void;
  dynamicActiveGroups: string[];
  toggleGroup: (groupId: string) => void;
}

export function CustomerGroupFilter({
  selGroups,
  setSelGroups,
  dynamicActiveGroups,
  toggleGroup,
}: CustomerGroupFilterProps) {
  const [showGroupPopover, setShowGroupPopover] = useState(false);
  const groupPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (groupPopoverRef.current && !groupPopoverRef.current.contains(event.target as Node)) {
        setShowGroupPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAllActiveSelected = selGroups.length === ALL_GROUPS.length && ALL_GROUPS.every(g => selGroups.includes(g.id));

  return (
    <div style={{ position: 'relative' }} ref={groupPopoverRef}>
      <button
        type="button"
        onClick={() => setShowGroupPopover(!showGroupPopover)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          background: showGroupPopover ? 'var(--color-surface-2)' : 'transparent',
          border: 'none', borderRadius: 6,
          fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-primary)',
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)',
          transition: 'background 0.15s'
        }}
        className="hover:bg-[var(--color-surface-1)]"
      >
        <Users size={14} style={{ color: 'var(--color-brand-500)' }} />
        <span>Groups: <strong>{selGroups.length}/{ALL_GROUPS.length}</strong></span>
        <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
      </button>

      {showGroupPopover && (
        <div className="sales-summary-popover" style={{ width: 280, zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-primary)' }}>Customer Groups</span>
            <button
              type="button"
              onClick={() => isAllActiveSelected ? setSelGroups([]) : setSelGroups(ALL_GROUPS.map(g => g.id))}
              style={{ fontSize: 'var(--erp-text-meta)', fontWeight: 800, background: 'none', border: 'none', color: isAllActiveSelected ? 'var(--color-danger-500)' : 'var(--color-ui-interactive)', cursor: 'pointer' }}>
              {isAllActiveSelected ? 'None' : 'All'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Active Groups Section */}
            {ALL_GROUPS.filter(g => dynamicActiveGroups.includes(g.id)).map(g => {
              const on = selGroups.includes(g.id);
              return (
                <button key={g.id} type="button" onClick={() => toggleGroup(g.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 6, fontSize: 'var(--erp-text-control)', fontWeight: 800,
                  border: `1px solid ${on ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`,
                  background: on ? 'var(--color-brand-50)' : 'var(--color-surface-1)',
                  color: on ? 'var(--color-brand-600)' : 'var(--color-text-primary)',
                  cursor: 'pointer', textAlign: 'left'
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
                  {g.label}
                </button>
              );
            })}
            {/* Inactive Groups Divider */}
            {ALL_GROUPS.filter(g => !dynamicActiveGroups.includes(g.id)).length > 0 && (
              <>
                <div style={{ marginTop: 8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ height: 1, flex: 1, background: 'var(--color-border-light)' }} />
                  <span style={{ fontSize: 'var(--erp-text-meta)', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Inactive</span>
                  <div style={{ height: 1, flex: 1, background: 'var(--color-border-light)' }} />
                </div>
                {/* Inactive Groups Section */}
                {ALL_GROUPS.filter(g => !dynamicActiveGroups.includes(g.id)).map(g => {
                  const on = selGroups.includes(g.id);
                  return (
                    <button key={g.id} type="button" onClick={() => toggleGroup(g.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 6, fontSize: 'var(--erp-text-control)', fontWeight: 800,
                      border: `1px solid ${on ? 'var(--color-border-strong)' : 'transparent'}`,
                      background: on ? 'var(--color-surface-2)' : 'transparent',
                      color: on ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                      cursor: 'pointer', textAlign: 'left',
                      opacity: on ? 1 : 0.7
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, opacity: 0.5 }} />
                      {g.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
