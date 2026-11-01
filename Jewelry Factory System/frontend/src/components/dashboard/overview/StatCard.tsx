import { PackageCheck, ClipboardList, Factory, BarChart3 } from 'lucide-react';
import type { DashboardStat } from '../../../types';

const variantStyles: Record<string, { iconColor: string }> = {
  procurement: { iconColor: 'text-[var(--color-brand-600)]' },
  orders: { iconColor: 'text-[var(--color-brand-600)]' },
  production: { iconColor: 'text-[var(--color-brand-600)]' },
  stock: { iconColor: 'text-[var(--color-brand-600)]' },
};

const iconMap: Record<string, React.ElementType> = {
  procurement: PackageCheck,
  orders: ClipboardList,
  production: Factory,
  stock: BarChart3,
};

interface StatCardProps {
  stat: DashboardStat;
}

export default function StatCard({ stat }: StatCardProps) {
  const style = variantStyles[stat.variant];
  const IconComponent = iconMap[stat.variant] || BarChart3;

  return (
    <div
      className="border bg-[var(--color-surface-0)] p-4 transition-colors duration-150 hover:bg-[var(--color-surface-2)]"
      style={{
        borderColor: 'var(--color-border-strong)',
        borderRadius: '8px',
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold capitalize tracking-widest text-[var(--color-text-secondary)]">{stat.label}</span>
        <IconComponent size={18} className={style.iconColor} />
      </div>
      <div className="mb-1 text-[length:var(--erp-text-grand)] font-bold leading-none" style={{ fontFamily: 'var(--font-display)' }}>
        {stat.value}
      </div>
      <div
        className={`flex items-center gap-1 text-xs ${
          stat.direction === 'up' ? 'text-[var(--color-success-500)]' : 'text-[var(--color-danger-500)]'
        }`}
      >
        {stat.change}
      </div>
    </div>
  );
}
