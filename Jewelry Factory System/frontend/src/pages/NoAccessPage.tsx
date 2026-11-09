import { ShieldOff } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';

/**
 * Shown when a signed-in user has no permitted page at all
 * (e.g. an account whose menu permissions are empty).
 */
export default function NoAccessPage() {
  return (
    <div className="app-page">
      <PageHeader breadcrumb={BREADCRUMBS.NO_ACCESS} contentLayout="workspace" />

      <div className="app-page-scroll content-scrollbar">
        <div className="app-content-frame app-content-frame--workspace app-page-content flex min-h-full items-center justify-center">
          <section className="app-panel w-full max-w-[680px] p-6" role="status">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
                <ShieldOff size={21} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[length:var(--erp-text-meta)] font-bold text-[var(--color-text-tertiary)]">NO ACCESS</span>
                <h2 className="mt-1 text-[length:var(--erp-text-page)] font-extrabold text-[var(--color-text-primary)]">
                  No pages are assigned to your account
                </h2>
                <p className="mt-2 text-[length:var(--erp-text-body)] leading-6 text-[var(--color-text-secondary)]">
                  Your account is signed in, but it has no menu permissions yet. Please contact a system administrator
                  to grant access, then sign in again.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
