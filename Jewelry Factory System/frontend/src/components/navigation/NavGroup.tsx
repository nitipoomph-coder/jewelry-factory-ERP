import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  PackageCheck,
  ClipboardList,
  Factory,
  FlaskConical,
  BarChart3,
  Home,
  Wrench,
  LayoutList,
  TrendingUp,
  Handshake,
  ShieldAlert,
  ShieldCheck,
  ClipboardCheck,
  Printer,
} from 'lucide-react';
import type { NavMenuGroup, NavMenuItem } from '../../types';
import { isNavigationItemActive } from '../../utils/navigationUtils';

const NAV_ICON_SIZE = 16;
const NAV_CHEVRON_SIZE = 14;
const ROW_HEIGHT = 36;
const CHILD_ROW_HEIGHT = 30;

const iconComponents: Record<string, React.ElementType> = {
  'package-check': PackageCheck,
  'clipboard-list': ClipboardList,
  'factory': Factory,
  'flask-conical': FlaskConical,
  'bar-chart-3': BarChart3,
  'home': Home,
  'wrench': Wrench,
  'layout-list': LayoutList,
  'trending-up': TrendingUp,
  'handshake': Handshake,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  'clipboard-check': ClipboardCheck,
  'printer': Printer,
};

interface NavGroupProps {
  group: NavMenuGroup;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export default function NavGroup({ group, isOpen, isActive, onToggle, collapsed = false, onNavigate }: NavGroupProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = group.items || [];

  const isItemActive = (item: NavMenuItem): boolean => {
    return isNavigationItemActive(item, location.pathname, location.search);
  };

  const activeParentId = items.find(item => item.items?.some(child => isItemActive(child)))?.id || '';
  const routeKey = `${location.pathname}${location.search}`;
  const [itemOverride, setItemOverride] = useState<{ routeKey: string; id: string } | null>(null);
  const openItemId = itemOverride?.routeKey === routeKey ? itemOverride.id : activeParentId;

  const visibleRows = items.reduce((count, item) => {
    const childCount = item.items && openItemId === item.id ? item.items.length : 0;
    return count + 1 + childCount;
  }, 0);

  const IconComponent = iconComponents[group.icon] || PackageCheck;
  const accentColor = group.accentColor || 'var(--color-brand-500)';

  const openPath = (path?: string) => {
    if (path) {
      navigate(path);
      if (onNavigate) onNavigate();
    }
  };

  if (collapsed) {
    return (
      <div className="mb-1 flex justify-center">
        <button
          onClick={() => {
            if (group.path) {
              navigate(group.path);
            } else {
              onToggle();
            }
          }}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--color-sidebar-hover)] ${isActive ? 'bg-[var(--color-sidebar-hover)]' : ''}`}
          style={isActive ? {
            boxShadow: `0 0 12px 1px color-mix(in oklch, ${accentColor} 25%, transparent)`,
          } : undefined}
          title={group.label}
        >
          <IconComponent
            size={NAV_ICON_SIZE}
            className={`transition-colors duration-150 ${isActive ? 'text-[var(--color-sidebar-accent)]' : 'text-[var(--color-sidebar-text)]'}`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      <button
        onClick={() => {
          if (group.path) {
            navigate(group.path);
            if (onNavigate) onNavigate();
          } else {
            onToggle();
          }
        }}
        className={`nav-accent-bar nav-item-hover flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--color-sidebar-hover)] ${isActive ? 'active' : ''}`}
        style={{ '--accent-bar-color': accentColor } as React.CSSProperties}
      >
        <span className="flex w-5 shrink-0 items-center justify-center relative">
          {isActive && (
            <span
              className="group-active-dot absolute -left-1.5"
              style={{ '--pulse-color': accentColor, background: accentColor } as React.CSSProperties}
            />
          )}
          <IconComponent
            size={NAV_ICON_SIZE}
            className={`transition-colors duration-150 ${isActive ? 'text-[var(--color-sidebar-accent)]' : 'text-[var(--color-sidebar-text)]'}`}
          />
        </span>
        <span
          className={`flex-1 text-[13px] font-medium transition-colors duration-150 ${isActive ? 'text-[var(--color-sidebar-text-active)]' : 'text-[var(--color-sidebar-text)]'}`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {group.label}
        </span>

        {items.length > 0 && <span className="nav-badge opacity-50">{items.length}</span>}

        {items.length > 0 && (
          <ChevronRight
            size={NAV_CHEVRON_SIZE}
            className={`shrink-0 text-[var(--color-sidebar-text)] opacity-40 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        )}
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isOpen ? `${visibleRows * ROW_HEIGHT + 12}px` : '0px',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {items.map((item, idx) => {
          const hasChildren = Boolean(item.items?.length);
          const isActive = isItemActive(item);
          const isSubOpen = openItemId === item.id;
          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    setItemOverride({ routeKey, id: openItemId === item.id ? '' : item.id });
                  } else {
                    openPath(item.path);
                  }
                }}
                className={`nav-item-hover flex w-full items-center gap-2 rounded py-1.5 pl-10 pr-3 text-left transition-all duration-150 ${isActive ? 'bg-[var(--color-brand-50)]' : 'hover:bg-[var(--color-sidebar-hover)]'}`}
                style={isOpen ? {
                  animation: `slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 40}ms both`,
                  minHeight: ROW_HEIGHT,
                } : undefined}
              >
                {isActive && <span className="sub-item-active-dot" />}
                <span
                  className={`flex-1 truncate text-[12.5px] leading-relaxed transition-colors duration-150 ${isActive ? 'font-bold text-[var(--color-sidebar-text-active)]' : 'text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-active)]'}`}
                  title={item.label}
                >
                  {item.label}
                </span>
                {item.code && (
                  <span className={`shrink-0 rounded px-1 py-0.5 text-[length:var(--erp-text-meta)] font-mono font-bold transition-colors duration-150 ${isActive ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)]' : 'text-[var(--color-sidebar-text)] opacity-30'}`}>
                    {item.code}
                  </span>
                )}
                {hasChildren && (
                  <ChevronRight
                    size={12}
                    className={`shrink-0 text-[var(--color-sidebar-text)] opacity-40 transition-transform duration-200 ${isSubOpen ? 'rotate-90' : ''}`}
                  />
                )}
              </button>

              {hasChildren && (
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{ maxHeight: isSubOpen ? `${(item.items?.length || 0) * CHILD_ROW_HEIGHT}px` : '0px' }}
                >
                  {item.items!.map(child => {
                    const isChildActive = isItemActive(child);
                    return (
                      <button
                        key={child.id}
                        onClick={() => openPath(child.path)}
                        className={`nav-item-hover flex w-full items-center gap-2 rounded py-1 pl-14 pr-3 text-left transition-all duration-150 ${isChildActive ? 'bg-[var(--color-brand-50)]' : 'hover:bg-[var(--color-sidebar-hover)]'}`}
                        style={{ minHeight: CHILD_ROW_HEIGHT }}
                      >
                        {isChildActive && <span className="sub-item-active-dot" />}
                        <span
                          className={`flex-1 truncate text-[12px] leading-relaxed transition-colors duration-150 ${isChildActive ? 'font-bold text-[var(--color-sidebar-text-active)]' : 'text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-active)]'}`}
                          title={child.label}
                        >
                          {child.label}
                        </span>
                        {child.code && (
                          <span className={`shrink-0 rounded px-1 py-0.5 text-[length:var(--erp-text-meta)] font-mono font-bold transition-colors duration-150 ${isChildActive ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-600)]' : 'text-[var(--color-sidebar-text)] opacity-30'}`}>
                            {child.code}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
