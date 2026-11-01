import { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Shield,
  Search,
  CheckCircle2,
  Building2,
  TrendingUp,
  LayoutList,
  Handshake,
  PackageCheck,
  ClipboardList,
  FlaskConical,
  BarChart3,
  Wrench,
  ShieldAlert,
  Home,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';
import { menuConfig } from '../../config/menuConfig';
import { adminUsersAPI, type ManagedUser } from '../../services/adminUsersAPI';
import { useToast } from '../../contexts/ToastContext';

interface UserAccessDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null;
  onSaved: () => void;
}

// Icon mapper for menu groups
const GROUP_ICONS: Record<string, any> = {
  home: Home,
  'sales-dashboard': TrendingUp,
  'order-tracker': LayoutList,
  subcontract: Handshake,
  procurement: PackageCheck,
  orders: ClipboardList,
  sample: FlaskConical,
  inventory: BarChart3,
  'spare-parts': Wrench,
  'admin-security': ShieldAlert,
};

export default function UserAccessDrawer({
  isOpen,
  onClose,
  user,
  onSaved,
}: UserAccessDrawerProps) {
  const { showToast } = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // All individual menu item IDs across all groups
  const allItemIds = useMemo(() => {
    const ids: string[] = [];
    menuConfig.forEach(g => {
      ids.push(g.id);
      if (g.items) {
        g.items.forEach(item => ids.push(item.id));
      }
    });
    return ids;
  }, []);

  // Total leaf items count
  const totalLeafCount = useMemo(() => {
    let count = 0;
    menuConfig.forEach(g => {
      if (g.items && g.items.length > 0) {
        count += g.items.length;
      } else {
        count += 1;
      }
    });
    return count;
  }, []);

  // Selected menu IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Synchronize state when user changes or drawer opens
  useEffect(() => {
    if (user && isOpen) {
      const raw = user.allowedMenus || [];
      if (raw.includes('*')) {
        setSelectedIds([...allItemIds]);
      } else {
        setSelectedIds([...raw]);
      }
      setSearchQuery('');
      setCollapsedGroups({});
    }
  }, [user, isOpen, allItemIds]);

  // Handle keyboard shortcut Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const isAllSelected = allItemIds.length > 0 && allItemIds.every(id => selectedIds.includes(id));

  // Count active leaf menus
  const activeLeafCount = isAllSelected
    ? totalLeafCount
    : menuConfig.reduce((acc, g) => {
        if (g.items && g.items.length > 0) {
          return acc + g.items.filter(item => selectedIds.includes(item.id)).length;
        }
        return acc + (selectedIds.includes(g.id) ? 1 : 0);
      }, 0);

  // Toggle single item
  const handleToggleItem = (itemId: string, groupId: string) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(itemId);
      let next = isSelected ? prev.filter(id => id !== itemId) : [...prev, itemId];

      // If child is selected, ensure parent group is present
      if (!isSelected && !next.includes(groupId)) {
        next.push(groupId);
      }
      return next;
    });
  };

  // Toggle entire group
  const handleToggleGroup = (groupId: string, childIds: string[]) => {
    setSelectedIds(prev => {
      const allGroupIds = [groupId, ...childIds];
      const allSelected = allGroupIds.every(id => prev.includes(id));

      if (allSelected) {
        return prev.filter(id => !allGroupIds.includes(id));
      } else {
        return Array.from(new Set([...prev, ...allGroupIds]));
      }
    });
  };

  // Toggle group collapse
  const handleToggleCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Select all menus
  const handleSelectAll = () => {
    setSelectedIds([...allItemIds]);
  };

  // Clear all menus
  const handleClearAll = () => {
    setSelectedIds([]);
  };

  // Toggle all groups expand/collapse
  const areAnyCollapsed = Object.values(collapsedGroups).some(Boolean);
  const handleToggleAllGroups = () => {
    if (areAnyCollapsed) {
      setCollapsedGroups({});
    } else {
      const all: Record<string, boolean> = {};
      menuConfig.forEach(g => {
        if (g.items && g.items.length > 0) all[g.id] = true;
      });
      setCollapsedGroups(all);
    }
  };

  // Save permissions
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toSave = isAllSelected ? ['*'] : selectedIds;
      const res = await adminUsersAPI.updateUserPermissions(user.username, toSave);

      showToast(res.message || `Permissions saved for ${user.username}`, 'success');

      // Sync active session if logged-in user modified themselves
      const currentUser = (localStorage.getItem('auth_user') || '').toUpperCase();
      if (currentUser === user.username.toUpperCase()) {
        localStorage.setItem('auth_allowed_menus', JSON.stringify(toSave));
        window.dispatchEvent(new Event('storage'));
      }

      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user permissions', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isAdmin = user.role === 'admin';
  const initial = (user.fullName || user.username || 'U')[0].toUpperCase();

  // Filter groups & items by search query
  const filteredGroups = menuConfig.filter(group => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchGroup = group.label.toLowerCase().includes(q) || group.id.toLowerCase().includes(q);
    const matchChild = group.items?.some(
      item =>
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.path && item.path.toLowerCase().includes(q))
    );
    return matchGroup || matchChild;
  });

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
      {/* ── Backdrop ───────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide-over Panel (Frameless Modern Surface) ─────────────────────────── */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full max-w-xl md:max-w-2xl bg-[var(--color-surface-0)] shadow-2xl flex flex-col h-full overflow-hidden transform transition-all duration-300 ease-out animate-in slide-in-from-right"
        role="dialog"
        aria-modal="true"
      >
        {/* ─── Header: User Identity & Close ─────────────────────────────────────── */}
        <div className="px-6 py-5 bg-[var(--color-surface-1)]/50 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                isAdmin
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--color-text-primary)] m-0 truncate">
                  {user.fullName || user.username}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                    isAdmin
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  <Shield size={10} />
                  {isAdmin ? 'Administrator' : 'Sales / Operator'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-mono">@{user.username}</span>
                <span className="opacity-40">•</span>
                <span className="inline-flex items-center gap-1 truncate text-slate-500 dark:text-slate-400">
                  <Building2 size={11} />
                  {user.department || 'General Operations'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── Search & Bulk Actions Bar (Modern Frameless) ────────────────────────── */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/40">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search menus by title, code, or route..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-100/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 transition-colors border-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleAllGroups}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
              title={areAnyCollapsed ? 'Expand All Categories' : 'Collapse All Categories'}
            >
              <ChevronsUpDown size={12} />
              <span className="hidden sm:inline">{areAnyCollapsed ? 'Expand All' : 'Collapse All'}</span>
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        </div>

        {/* ─── Scrollable Menu Hierarchy List (Frameless Modern Flow) ─────────────── */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3.5 content-scrollbar bg-slate-50/50 dark:bg-slate-900"
          style={{ overscrollBehavior: 'contain' }}
        >
          {filteredGroups.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No menus match "{searchQuery}"
            </div>
          ) : (
            filteredGroups.map(group => {
              const IconComponent = GROUP_ICONS[group.id] || LayoutList;
              const childItems = group.items || [];
              const childIds = childItems.map(i => i.id);

              const isGroupChecked = selectedIds.includes(group.id);
              const areAllChildrenChecked =
                childIds.length > 0 && childIds.every(id => selectedIds.includes(id));
              const isPartiallyChecked =
                !areAllChildrenChecked && childIds.some(id => selectedIds.includes(id));

              const activeCount = childItems.length > 0
                ? childItems.filter(i => selectedIds.includes(i.id)).length
                : isGroupChecked ? 1 : 0;

              const totalCount = childItems.length > 0 ? childItems.length : 1;
              const isCollapsed = Boolean(collapsedGroups[group.id]) && !searchQuery.trim();

              return (
                <div
                  key={group.id}
                  className="shrink-0 rounded-2xl bg-white dark:bg-slate-800/40 p-2 sm:p-2.5 shadow-xs border border-slate-200/40 dark:border-slate-800/40 transition-all"
                >
                  {/* ── Category Header Row (Frameless & Sleek) ── */}
                  <div
                    className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-700/30 transition-colors cursor-pointer select-none"
                    onClick={() => childItems.length > 0 && handleToggleCollapse(group.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={areAllChildrenChecked || (childItems.length === 0 && isGroupChecked)}
                        ref={el => {
                          if (el) el.indeterminate = isPartiallyChecked;
                        }}
                        onClick={e => e.stopPropagation()}
                        onChange={() => handleToggleGroup(group.id, childIds)}
                        className="w-4 h-4 rounded text-indigo-600 bg-transparent border-slate-400 dark:border-slate-600 focus:ring-0 cursor-pointer shrink-0"
                      />

                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <IconComponent size={13} />
                      </div>

                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {group.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {group.workspace && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                          {group.workspace}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                          activeCount === totalCount
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : activeCount > 0
                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {activeCount} / {totalCount} active
                      </span>

                      {childItems.length > 0 && (
                        <div className="text-slate-400 p-0.5">
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Sub-menu Items Checklist (Modern Frameless Rows) ── */}
                  {!isCollapsed && (
                    <div className="mt-1 space-y-0.5">
                      {childItems.length > 0 ? (
                        childItems.map(item => {
                          const isChecked = selectedIds.includes(item.id);

                          return (
                            <label
                              key={item.id}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-semibold'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-700/30'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleItem(item.id, group.id)}
                                  className="w-3.5 h-3.5 rounded text-indigo-600 bg-transparent border-slate-400 dark:border-slate-600 focus:ring-0 cursor-pointer shrink-0"
                                />
                                <span className="truncate">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {item.code && (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                    {item.code}
                                  </span>
                                )}
                                {item.path && (
                                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                    {item.path}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })
                      ) : (
                        // Single item without children (e.g. Factory Overview)
                        <div className="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {group.path}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ─── Sticky Footer (Actions) ───────────────────────────────────────────── */}
        <div className="px-6 py-4 bg-[var(--color-surface-1)]/60 shrink-0 flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--color-text-secondary)] font-mono">
            <span className="font-bold text-[var(--color-text-primary)]">{activeLeafCount}</span> of {totalLeafCount} menus active
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-surface-2)]/40 hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all cursor-pointer border-0"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50 active:scale-95 border-0"
            >
              <CheckCircle2 size={14} />
              <span>{isSaving ? 'Saving...' : `Save Permissions (${activeLeafCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
