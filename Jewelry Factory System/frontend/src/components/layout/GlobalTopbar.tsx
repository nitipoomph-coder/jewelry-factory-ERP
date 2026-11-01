import { Palette, Printer, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, PanelLeft, ChevronDown, Check, Layers, Boxes } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';
import UserAvatarDropdown from './UserAvatarDropdown';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { useTopbarActions } from '../../contexts/TopbarActionContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface GlobalTopbarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function GlobalTopbar({ isSidebarOpen, onToggleSidebar }: GlobalTopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveBreadcrumbs } = useBreadcrumbs();
  const { theme, setTheme } = useTheme();
  const { topbarActions } = useTopbarActions();
  const { workspace, switchWorkspace } = useWorkspace();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setShowWorkspaceMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrintPDF = () => {
    setShowExportMenu(false);
    window.dispatchEvent(new CustomEvent('app-print'));
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => {
      window.print();
    });
  };


  return (
    <header
      className="app-global-topbar flex items-center justify-between h-11 sm:h-12 px-3 sm:px-5 w-full shrink-0"
      style={{
        background: 'var(--color-ui-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-panel)',
      }}
    >
      {/* Left: [Toggle Sidebar] -> [Wordmark JEWELRY] -> [Divider] -> [Back Button] -> [Breadcrumbs] */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 mr-4">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)] transition-colors shrink-0 cursor-pointer border-none bg-transparent"
            title={isSidebarOpen ? 'Hide Menu (Collapse sidebar) [Ctrl+B]' : 'Show Menu (Expand sidebar) [Ctrl+B]'}
            aria-label="Toggle sidebar navigation"
          >
            <PanelLeft size={18} strokeWidth={1.75} />
          </button>
        )}

        {/* Wordmark JEWELRY Factory system (links to home /) */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center select-none cursor-pointer border-none bg-transparent p-0 transition-opacity hover:opacity-85 shrink-0 gap-1.5"
          title="Factory Overview"
        >
          <span
            className="text-[17px] sm:text-[18px] font-black tracking-[0.14em] uppercase font-display"
            style={{
              fontFamily: 'var(--font-logo)',
              background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            JEWELRY
          </span>
          <span
            className="text-[11px] font-medium tracking-normal shrink-0"
            style={{ color: 'var(--text-muted, var(--color-text-tertiary))' }}
          >
            Factory system
          </span>
        </button>

        {/* Subtle vertical separator */}
        <div className="h-4 w-px bg-[var(--color-border-light)] mx-1 sm:mx-1.5 shrink-0" />

        {/* Workspace Switcher (Production Control / Inventory & Supply) */}
        <div className="relative shrink-0" ref={workspaceMenuRef}>
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer border-0"
            title="Switch Workspace"
            aria-label="Switch Workspace"
          >
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
              workspace === 'PCC'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              {workspace === 'PCC' ? <Layers size={13} /> : <Boxes size={13} />}
            </div>
            <span className="font-semibold tracking-tight">
              {workspace === 'PCC' ? 'Production Control' : 'Inventory & Supply'}
            </span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {/* Switcher Dropdown (Concise & Modern) */}
          {showWorkspaceMenu && (
            <div
              className="absolute left-0 mt-2 w-56 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl p-1.5 z-[120] flex flex-col gap-1 bg-white dark:bg-slate-900"
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Workspace
              </div>

              {/* Choice 1: Production Control */}
              <button
                type="button"
                onClick={() => {
                  switchWorkspace('PCC');
                  setShowWorkspaceMenu(false);
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer border-0 ${
                  workspace === 'PCC'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    workspace === 'PCC'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <Layers size={14} />
                  </div>
                  <span className="text-xs font-semibold">Production Control</span>
                </div>
                {workspace === 'PCC' && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
              </button>

              {/* Choice 2: Inventory & Supply */}
              <button
                type="button"
                onClick={() => {
                  switchWorkspace('INVENTORY');
                  setShowWorkspaceMenu(false);
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer border-0 ${
                  workspace === 'INVENTORY'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    workspace === 'INVENTORY'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <Boxes size={14} />
                  </div>
                  <span className="text-xs font-semibold">Inventory & Supply</span>
                </div>
                {workspace === 'INVENTORY' && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Subtle vertical separator */}
        <div className="h-4 w-px bg-[var(--color-border-light)] mx-1 sm:mx-1.5 shrink-0" />

        {/* Back Button (shown on non-root routes) - borderless */}
        {location.pathname !== '/' && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)] transition-colors shrink-0 cursor-pointer p-0"
            title="Back (Back)"
            aria-label="Go back"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
        )}

        {/* Breadcrumbs: [Parent Category] (13px, secondary) › [Current Page] (15-16px, bold dark) */}
        {effectiveBreadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 truncate">
            {effectiveBreadcrumbs.length === 1 ? (
              <span className="text-[15px] sm:text-[16px] font-extrabold text-[var(--color-text-primary)] truncate font-display">
                {effectiveBreadcrumbs[0].label}
              </span>
            ) : (
              <>
                {effectiveBreadcrumbs.slice(0, -1).map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5 shrink-0">
                    {i > 0 && (
                      <ChevronRight size={13} strokeWidth={1.75} className="text-[var(--color-text-tertiary)] opacity-60 shrink-0" />
                    )}
                    {item.path ? (
                      <button
                        type="button"
                        onClick={() => navigate(item.path!)}
                        className="text-[13px] font-semibold text-[var(--color-brand-600)] hover:underline cursor-pointer bg-transparent border-none p-0 outline-none transition-colors truncate"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span className="text-[13px] font-semibold text-[var(--color-text-secondary)] truncate">
                        {item.label}
                      </span>
                    )}
                  </span>
                ))}
                <ChevronRight size={13} strokeWidth={1.75} className="text-[var(--color-text-tertiary)] opacity-60 shrink-0" />
                <span className="text-[15px] sm:text-[16px] font-extrabold text-[var(--color-text-primary)] truncate font-display">
                  {effectiveBreadcrumbs[effectiveBreadcrumbs.length - 1].label}
                </span>
              </>
            )}
          </nav>
        )}
      </div>

      {/* Right: [Print / Export Dropdown] -> [Notification Bell] -> [Theme Palette] -> [User Avatar Dropdown] */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        {topbarActions}

        {/* 1. Print / Export Dropdown */}
        <div className="relative z-[100]" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center border-none cursor-pointer justify-center rounded-lg transition-colors duration-150 ${
              showExportMenu
                ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]'
            }`}
            title="Export this page"
            aria-label="Export or Print this page"
          >
            <Printer size={18} strokeWidth={1.75} />
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 z-[100] mt-2 w-48 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-2 animate-in fade-in zoom-in-95 duration-100"
              style={{ boxShadow: 'var(--shadow-dropdown)' }}
            >
              <div className="mb-1 px-3 pt-1 text-[length:var(--erp-text-meta)] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Export this page
              </div>
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] opacity-40 bg-transparent text-[var(--color-text-primary)] font-semibold select-none"
                title="Currently unavailable"
              >
                <FileSpreadsheet size={16} strokeWidth={1.75} className="text-[var(--color-success-600)] shrink-0" />
                <span>Export to Excel</span>
              </button>
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] opacity-40 bg-transparent text-[var(--color-text-primary)] font-semibold select-none"
                title="Currently unavailable"
              >
                <FileText size={16} strokeWidth={1.75} className="text-[var(--color-brand-600)] shrink-0" />
                <span>Export to CSV</span>
              </button>
              <div className="my-1.5 h-px w-full bg-[var(--color-border-light)]" />
              <button
                type="button"
                onClick={handlePrintPDF}
                className="flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold"
              >
                <Printer size={16} strokeWidth={1.75} className="text-[var(--color-brand-600)] shrink-0" />
                <span>Print / PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Notification Dropdown */}
        <NotificationDropdown />

        {/* 2. Theme Palette Switcher */}
        <div className="relative z-[100]" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center border-none cursor-pointer justify-center rounded-lg transition-colors duration-150 ${
              showThemeMenu
                ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]'
            }`}
            title="Change Theme (Theme)"
            aria-label="Change theme"
          >
            <Palette size={18} strokeWidth={1.75} />
          </button>

          {showThemeMenu && (
            <div
              className="absolute right-0 z-[100] mt-2 w-48 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-2 animate-in fade-in zoom-in-95 duration-100"
              style={{ boxShadow: 'var(--shadow-dropdown)' }}
            >
              <div className="mb-1 px-3 pt-1 text-[length:var(--erp-text-meta)] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                UI Themes
              </div>
              <button
                type="button"
                onClick={() => {
                  setTheme('royal-white');
                  setShowThemeMenu(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors ${
                  theme === 'royal-white'
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold'
                    : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[var(--color-border-default)]"
                  style={{ background: 'var(--color-theme-preview-royal)' }}
                />
                Royal White
              </button>
              <button
                type="button"
                onClick={() => {
                  setTheme('dark-gold');
                  setShowThemeMenu(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors ${
                  theme === 'dark-gold'
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold'
                    : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[var(--color-border-default)]"
                  style={{ background: 'var(--color-theme-preview-gold)' }}
                />
                Dark Gold
              </button>
              <button
                type="button"
                onClick={() => {
                  setTheme('modern-dark');
                  setShowThemeMenu(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 border-none rounded-lg px-3 py-2 text-[length:var(--erp-text-body)] transition-colors ${
                  theme === 'modern-dark'
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-bold'
                    : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] font-semibold'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[var(--color-border-default)]"
                  style={{ background: 'var(--color-theme-preview-dark)' }}
                />
                Modern Dark
              </button>
            </div>
          )}
        </div>

        {/* Subtle separator */}
        <div className="h-4 w-px bg-[var(--color-border-light)] mx-0.5 hidden sm:block" />

        {/* 3. User Avatar Dropdown */}
        <UserAvatarDropdown />
      </div>
    </header>
  );
}
