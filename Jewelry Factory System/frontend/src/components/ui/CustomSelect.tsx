// src/components/ui/CustomSelect.tsx
import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  width?: string | number;
  icon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function CustomSelect({ value, onChange, options, placeholder = "Select...", width = '100%', icon, disabled = false, ariaLabel }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const selectedOpt = options.find(o => String(o.value) === String(value));

  return (
    <div className={`relative ${isOpen ? 'z-[9999]' : 'z-[10]'}`} ref={menuRef} style={{ width }}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)',
          color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 700,
          outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: 'none',
          transition: 'color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
          opacity: disabled ? 0.55 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
        }}
        className="hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-1)] focus:border-[var(--color-brand-300)]"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {icon && <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-brand-600)' }}>{icon}</span>}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{selectedOpt ? selectedOpt.label : placeholder}</span>
        </div>
        <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} className="flex-shrink-0 text-[var(--color-text-tertiary)]" />
      </button>

      {isOpen && (
        <div role="listbox" className="custom-scrollbar absolute left-0 z-[100] mt-1 w-max rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-1.5" style={{ maxHeight: 200, overflowY: 'auto', minWidth: '100%', boxShadow: 'var(--shadow-dropdown)' }}>
          {options.filter(opt => String(value) !== String(opt.value)).map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              role="option"
              aria-selected={false}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors font-bold border border-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]"
              style={{ cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{opt.label}</span>
            </button>
          ))}
          {options.filter(opt => String(value) !== String(opt.value)).length === 0 && (
            <div className="px-3 py-2 text-sm text-[var(--color-text-tertiary)] italic text-center">No other options</div>
          )}
        </div>
      )}
    </div>
  );
}
