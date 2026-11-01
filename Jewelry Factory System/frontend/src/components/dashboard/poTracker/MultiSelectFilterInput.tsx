import { useState, useRef, useEffect, useMemo } from 'react';

interface MultiSelectFilterInputProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  width?: string;
}

export function MultiSelectFilterInput({ value, onChange, options, placeholder, width = '120px' }: MultiSelectFilterInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on the LAST term being typed after the comma
  const lastTerm = value.split(',').pop()?.trim().toLowerCase() || '';
  
  const filteredOptions = useMemo(() => {
    return options.filter(opt => opt.toLowerCase().includes(lastTerm));
  }, [options, lastTerm]);

  const handleOptionClick = (option: string) => {
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    
    // If the user was typing a partial match, remove it before appending the full option
    if (parts.length > 0 && option.toLowerCase().includes(parts[parts.length - 1].toLowerCase())) {
        parts.pop();
    }
    
    // Check if the option is already selected
    if (!parts.includes(option)) {
      parts.push(option);
    }
    
    onChange(parts.join(', ') + (parts.length > 0 ? ', ' : ''));
    
    // Keep focus or just let user keep typing
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid var(--color-border-strong)',
          background: 'var(--color-surface-0)',
          fontSize: '0.8rem',
          fontWeight: 600,
          outline: 'none',
        }}
        className="focus:border-brand-400"
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'var(--color-surface-0)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 50,
        }} className="custom-scrollbar">
          {filteredOptions.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => handleOptionClick(opt)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                borderBottom: idx === filteredOptions.length - 1 ? 'none' : '1px solid var(--color-border)',
              }}
              className="hover:bg-[var(--color-surface-1)] hover:text-[var(--color-brand-600)]"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
