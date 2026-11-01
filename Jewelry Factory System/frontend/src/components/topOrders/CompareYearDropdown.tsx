import { useEffect, useRef, useState } from 'react';

interface CompareYearDropdownProps {
  availableYears: string[];
  baseYear: string;
  compareYear: string;
  onChange: (year: string) => void;
}

export default function CompareYearDropdown({
  availableYears,
  baseYear,
  compareYear,
  onChange,
}: CompareYearDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const years = availableYears.filter(year => year !== baseYear);
  const disabled = years.length === 0;

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative z-[100]" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(value => !value)}
        disabled={disabled}
        style={{
          background: 'var(--color-surface-0)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 12,
          padding: '8px 16px',
          fontSize: '0.9rem',
          fontWeight: 800,
          color: disabled ? 'var(--color-text-quaternary)' : 'var(--color-text-primary)',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--font-display)',
          boxShadow: '0 2px 4px color-mix(in srgb, var(--color-surface-900) 4%, transparent)',
          transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        className="hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-1)]"
      >
        <span className="text-[var(--color-text-secondary)] font-medium text-[0.8rem] capitalize tracking-wider">
          Compare with
        </span>
        {compareYear || '-'}
        <div
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className="text-[var(--color-text-tertiary)]"
        >
          <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-1)] p-2 shadow-xl z-[100] animate-fade-in-up">
          {years.map(year => (
            <button
              key={year}
              type="button"
              onClick={() => {
                onChange(year);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm transition-colors font-display font-bold ${compareYear === year ? 'border border-[var(--color-brand-300)] bg-[color-mix(in_srgb,var(--color-brand-500)_9%,var(--color-surface-0))] text-[var(--color-brand-600)]' : 'border border-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-0)]'}`}
            >
              <span>{year}</span>
              {compareYear === year && <div className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--color-brand-500)_70%,var(--color-surface-0))]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
