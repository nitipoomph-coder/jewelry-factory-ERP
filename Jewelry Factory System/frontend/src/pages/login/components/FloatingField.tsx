import { useId, type ReactNode } from 'react';

interface FloatingFieldProps {
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  endAdornment?: ReactNode;
  label: string;
  name: string;
  required?: boolean;
  staggerClass?: string;
  type?: 'text' | 'password';
  value: string;
  onChange: (value: string) => void;
}

export function FloatingField({
  autoComplete,
  autoFocus,
  disabled,
  endAdornment,
  label,
  name,
  required,
  staggerClass = '',
  type = 'text',
  value,
  onChange,
}: FloatingFieldProps) {
  const inputId = useId();

  return (
    <div className={`floating-container ${staggerClass}`.trim()}>
      <input
        id={inputId}
        name={name}
        type={type}
        placeholder=" "
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        required={required}
        className={`login-input${endAdornment ? ' login-input--with-action' : ''}`}
      />
      <fieldset className="floating-fieldset" aria-hidden="true">
        <legend className="floating-legend"><span>{label}</span></legend>
      </fieldset>
      <label className="floating-label" htmlFor={inputId}>{label}</label>
      {endAdornment}
    </div>
  );
}
