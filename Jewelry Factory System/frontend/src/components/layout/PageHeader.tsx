import React, { useEffect } from 'react';
import type { BreadcrumbItem } from '../../config/breadcrumbs';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';

export type { BreadcrumbItem };

type ContentLayout = 'dashboard' | 'dashboard-wide' | 'workspace';

interface PageHeaderProps {
  breadcrumb: BreadcrumbItem[];
  contentLayout?: ContentLayout;
  rightContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  icon?: React.ReactNode;
  hideTitle?: boolean;
}

export default function PageHeader({ breadcrumb, contentLayout = 'workspace', rightContent, bottomContent, icon, hideTitle = true }: PageHeaderProps) {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    if (breadcrumb && breadcrumb.length > 0) {
      setBreadcrumbs(breadcrumb);
    }
  }, [breadcrumb, setBreadcrumbs]);

  const frameClassName = `app-content-frame app-content-frame--${contentLayout}`;

  if (hideTitle) {
    if (!bottomContent && !rightContent) {
      return null;
    }
    return (
      <header className="flex flex-col py-2.5 bg-[var(--color-ui-canvas)]">
        <div className={`${frameClassName} app-page-inline flex flex-wrap items-center justify-between gap-3`}>
          {/* Left: Filters */}
          <div className="flex items-center flex-wrap gap-2 min-w-0">
            {bottomContent}
          </div>

          {/* Right: Tools / Actions */}
          {rightContent && (
            <div className="flex items-center justify-end gap-2 flex-wrap shrink-0">
              {rightContent}
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="flex flex-col py-3.5 bg-[var(--color-ui-canvas)]">
      <div className={`${frameClassName} app-page-inline flex flex-wrap items-center justify-between gap-4`}>
        {/* Left: Page Title */}
        <div className="flex min-w-0 items-center gap-3 flex-1">
          <h1 className="m-0 flex flex-wrap min-w-0 items-center gap-2 text-[length:var(--erp-text-page)] font-extrabold leading-tight text-[var(--color-text-primary)] font-display">
            {icon && <span className="flex items-center text-[var(--color-brand-600)]">{icon}</span>}
            <span className="truncate">{breadcrumb[breadcrumb.length - 1]?.label}</span>
          </h1>
        </div>

        {/* Right: Tools / Actions */}
        {rightContent && (
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {rightContent}
          </div>
        )}
      </div>

      {/* Bottom Content / Filters */}
      {bottomContent && (
        <div className={`${frameClassName} app-page-inline mt-4`}>
          {bottomContent}
        </div>
      )}
    </header>
  );
}
