import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Blocks } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { menuConfig } from '../config/menuConfig';

export default function PlaceholderPage() {
  const location = useLocation();
  const navigate = useNavigate();

  let groupLabel = 'Module';
  let itemLabel = 'Page';
  let itemCode = '';

  for (const group of menuConfig) {
    const found = (group.items || []).find(item => item.path === location.pathname);
    if (found) {
      groupLabel = group.label;
      itemLabel = found.label;
      itemCode = found.code || '';
      break;
    }
  }

  const displayTitle = itemCode ? `${itemLabel} (${itemCode})` : itemLabel;

  return (
    <div className="app-page">
      <PageHeader
        breadcrumb={BREADCRUMBS.PLACEHOLDER(groupLabel, displayTitle)}
        contentLayout="workspace"
      />

      <div className="app-page-scroll content-scrollbar">
        <div className="app-content-frame app-content-frame--workspace app-page-content flex min-h-full items-center justify-center">
          <section className="app-panel w-full max-w-[680px] p-6" role="status">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
                <Blocks size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[length:var(--erp-text-meta)] font-bold text-[var(--color-text-tertiary)]">MODULE NOT CONNECTED</span>
                <h2 className="mt-1 text-[length:var(--erp-text-page)] font-extrabold text-[var(--color-text-primary)]">{displayTitle}</h2>
                <p className="mt-2 text-[length:var(--erp-text-body)] leading-6 text-[var(--color-text-secondary)]">
                  This route is reserved, but its form and data service have not been implemented yet.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] px-4 py-2 text-[length:var(--erp-text-control)] font-bold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]"
                >
                  <ArrowLeft size={15} /> Back
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
