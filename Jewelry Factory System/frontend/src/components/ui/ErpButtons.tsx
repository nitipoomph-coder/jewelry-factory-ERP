import { useRef, useState, useEffect, useCallback, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { erpButtonTokens } from './erpButtonTokens';
import './ErpButtons.css';

type ErpButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ErpButtonSize = 'sm' | 'md';

interface ErpButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ErpButtonVariant;
  size?: ErpButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

export function ErpButton({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ErpButtonProps) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      disabled={disabled || loading}
      className={`erp-btn erp-btn--${variant} erp-btn--${size} ${className}`}
    >
      {loading ? <Loader2 size={erpButtonTokens.iconSize} className="erp-btn__spinner" /> : icon}
      {children && <span className="erp-btn__label">{children}</span>}
    </button>
  );
}

type IconButtonTone = 'view' | 'edit' | 'refresh' | 'delete' | 'export' | 'neutral' | 'ghost';

interface ErpIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: IconButtonTone;
  icon: ReactNode;
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function ErpIconButton({
  label,
  tone = 'neutral',
  icon,
  size = 'sm',
  loading,
  disabled,
  className = '',
  ...props
}: ErpIconButtonProps) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      title={label}
      aria-label={label}
      disabled={disabled || loading}
      className={`erp-icon-btn erp-icon-btn--${tone} erp-icon-btn--${size} ${className}`}
    >
      {loading ? <Loader2 size={erpButtonTokens.iconSize} className="erp-btn__spinner" /> : icon}
    </button>
  );
}

export type ErpSegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

export function ErpSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ErpSegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const updateIndicator = useCallback(() => {
    if (!containerRef.current) return;
    const activeButton = containerRef.current.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        opacity: 1,
      });
    }
  }, [value]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator, options]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <div ref={containerRef} className="erp-segmented" role="group" aria-label={ariaLabel}>
      {/* Smooth Sliding Pill Indicator */}
      <div
        className="erp-segmented__indicator"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          opacity: indicatorStyle.opacity,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          data-value={option.value}
          type="button"
          className={`erp-segment ${value === option.value ? 'erp-segment--active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
