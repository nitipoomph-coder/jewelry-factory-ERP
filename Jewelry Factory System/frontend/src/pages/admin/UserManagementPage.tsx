import { useState, useEffect, useTransition } from 'react';
import {
  Users,
  Shield,
  RefreshCw,
  Search,
  Building2,
  SlidersHorizontal,
  Eye,
} from 'lucide-react';
import {
  adminUsersAPI,
  type ManagedUser,
} from '../../services/adminUsersAPI';
import { useToast } from '../../contexts/ToastContext';
import UserAccessDrawer from '../../components/admin/UserAccessDrawer';
import { getErrorMessage } from '../../utils/errors';

export default function UserManagementPage() {
  const { showToast } = useToast();
  const [, startTransition] = useTransition();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'sales'>('ALL');

  // Slide-over Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Network part only. Callers set the loading flags; the initial load relies on isLoading starting as true.
  const loadUsers = async () => {
    try {
      const data = await adminUsersAPI.getUsers();
      startTransition(() => {
        setUsers(data);
        // If drawer is currently open for a user, update selected user reference
        if (selectedUser) {
          const updated = data.find(u => u.username.toUpperCase() === selectedUser.username.toUpperCase());
          if (updated) setSelectedUser(updated);
        }
      });
    } catch (err) {
      console.error('[UserManagement] Fetch error:', err);
      showToast(getErrorMessage(err, 'Failed to load user directory'), 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchUsers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    await loadUsers();
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered users
  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inUsername = user.username.toLowerCase().includes(q);
      const inName = (user.fullName || '').toLowerCase().includes(q);
      const inDept = (user.department || '').toLowerCase().includes(q);
      return inUsername || inName || inDept;
    }
    return true;
  });

  // KPI calculations
  const totalUsers = users.length;
  const adminUsersCount = users.filter(u => u.role === 'admin').length;
  const salesUsersCount = users.filter(u => u.role === 'sales').length;

  const handleOpenDrawer = (user: ManagedUser) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full text-[var(--color-text-primary)] pb-12">
        {/* ─── Top Header Bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fixed-indigo-500/20 via-fixed-purple-500/15 to-fixed-blue-500/10 flex items-center justify-center text-fixed-indigo-400 shadow-xs">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] m-0">
                  User Directory & Access Control
                </h1>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-fixed-slate-500/10 text-[var(--color-text-secondary)]">
                  {totalUsers} Accounts
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] m-0 mt-0.5">
                Manage enterprise user credentials, review system roles, and govern sidebar menu visibility.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => fetchUsers(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)] transition-all cursor-pointer shadow-xs border-0 disabled:opacity-50"
              title="Refresh directory from database"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-fixed-indigo-400' : ''} />
              <span>Refresh Directory</span>
            </button>
          </div>
        </div>

        {/* ─── Search & Role Filter Bar (Modern Clean) ───────────────────────────── */}
        <div className="bg-fixed-slate-100/80 dark:bg-fixed-slate-900/60 rounded-2xl p-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fixed-slate-400"
            />
            <input
              type="text"
              placeholder="Search by full name, @username, or department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-fixed-white dark:bg-fixed-slate-800 text-fixed-slate-900 dark:text-fixed-slate-100 outline-hidden focus:ring-2 focus:ring-fixed-indigo-500/20 placeholder:text-fixed-slate-400 transition-colors border border-fixed-slate-200/50 dark:border-fixed-slate-700/50"
            />
          </div>

          {/* Role Segment Tabs */}
          <div className="flex items-center gap-1 bg-fixed-white/80 dark:bg-fixed-slate-800/80 p-1 rounded-xl text-xs border border-fixed-slate-200/40 dark:border-fixed-slate-700/40">
            <span className="text-fixed-slate-400 dark:text-fixed-slate-500 px-2 font-medium text-[11px]">
              Role:
            </span>
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0 ${
                roleFilter === 'ALL'
                  ? 'bg-fixed-slate-900 text-fixed-white dark:bg-fixed-white dark:text-fixed-slate-900 shadow-xs'
                  : 'text-fixed-slate-600 dark:text-fixed-slate-400 hover:text-fixed-slate-900 dark:hover:text-fixed-white'
              }`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0 ${
                roleFilter === 'admin'
                  ? 'bg-fixed-purple-600 text-fixed-white shadow-xs'
                  : 'text-fixed-slate-600 dark:text-fixed-slate-400 hover:text-fixed-slate-900 dark:hover:text-fixed-white'
              }`}
            >
              Administrators ({adminUsersCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('sales')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0 ${
                roleFilter === 'sales'
                  ? 'bg-fixed-emerald-600 text-fixed-white shadow-xs'
                  : 'text-fixed-slate-600 dark:text-fixed-slate-400 hover:text-fixed-slate-900 dark:hover:text-fixed-white'
              }`}
            >
              Sales / Operators ({salesUsersCount})
            </button>
          </div>
        </div>

        {/* ─── Enterprise User Directory Table (High Contrast & Clean Typography) ─── */}
        <div className="bg-fixed-white dark:bg-fixed-slate-900/60 rounded-2xl shadow-xs overflow-hidden flex flex-col border border-fixed-slate-200/50 dark:border-fixed-slate-800/50">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-fixed-slate-100 dark:border-fixed-slate-800/50 bg-fixed-slate-50/70 dark:bg-fixed-slate-900/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-fixed-slate-500 dark:text-fixed-slate-400 m-0">
              Active Directory ({filteredUsers.length} Users)
            </h2>
            <span className="text-xs text-fixed-slate-500 dark:text-fixed-slate-400 hidden sm:inline">
              Click <strong className="text-fixed-indigo-600 dark:text-fixed-indigo-400 font-semibold">Configure Access</strong> to customize module visibility
            </span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-xs text-fixed-slate-500 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-fixed-indigo-500" />
              <span>Loading enterprise user directory...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-2">
              <Users size={32} className="text-fixed-slate-400 opacity-60" />
              <div className="text-sm font-semibold text-fixed-slate-800 dark:text-fixed-slate-200">
                No Accounts Found
              </div>
              <p className="text-xs text-fixed-slate-500 m-0">
                No user accounts match the selected filters or search terms.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-fixed-slate-50/50 dark:bg-fixed-slate-900/40 text-fixed-slate-500 dark:text-fixed-slate-400 border-b border-fixed-slate-100 dark:border-fixed-slate-800/50">
                    <th className="py-3 px-5 font-semibold">User Account</th>
                    <th className="py-3 px-5 font-semibold">Department</th>
                    <th className="py-3 px-5 font-semibold">System Role</th>
                    <th className="py-3 px-5 font-semibold">Navigation Access Scope</th>
                    <th className="py-3 px-5 font-semibold">Status</th>
                    <th className="py-3 px-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fixed-slate-100 dark:divide-fixed-slate-800/40 bg-fixed-white dark:bg-fixed-slate-900/30">
                  {filteredUsers.map(user => {
                    const isAdmin = user.role === 'admin';
                    const initial = (user.fullName || user.username || 'U')[0].toUpperCase();
                    const isAllMenus = user.allowedMenus?.includes('*');
                    const menuCount = user.allowedMenus?.length || 0;

                    return (
                      <tr
                        key={String(user.id)}
                        className="hover:bg-fixed-slate-50/80 dark:hover:bg-fixed-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => handleOpenDrawer(user)}
                      >
                        {/* User Profile */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isAdmin
                                  ? 'bg-fixed-purple-100 dark:bg-fixed-purple-950/60 text-fixed-purple-700 dark:text-fixed-purple-300'
                                  : 'bg-fixed-emerald-100 dark:bg-fixed-emerald-950/60 text-fixed-emerald-700 dark:text-fixed-emerald-300'
                              }`}
                            >
                              {initial}
                            </div>
                            <div>
                              <div className="font-semibold text-fixed-slate-900 dark:text-fixed-white text-xs flex items-center gap-2">
                                <span>{user.fullName || user.username}</span>
                              </div>
                              <div className="font-mono text-[11px] text-fixed-slate-500 dark:text-fixed-slate-400 flex items-center gap-2 mt-0.5">
                                <span>@{user.username}</span>
                                <span className="text-fixed-slate-300 dark:text-fixed-slate-600">•</span>
                                <span>{String(user.id).replace('pcc_', 'UID: #')}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-5 text-fixed-slate-700 dark:text-fixed-slate-300">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Building2 size={13} className="text-fixed-slate-400 shrink-0" />
                            <span>{user.department || 'General Operations'}</span>
                          </span>
                        </td>

                        {/* Role (Clean Text & Colored Icon, No Background Pill) */}
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fixed-slate-800 dark:text-fixed-slate-200">
                            <Shield
                              size={14}
                              className={isAdmin ? 'text-fixed-purple-600 dark:text-fixed-purple-400' : 'text-fixed-emerald-600 dark:text-fixed-emerald-400'}
                            />
                            <span>{isAdmin ? 'Administrator' : 'Sales / Operator'}</span>
                          </span>
                        </td>

                        {/* Navigation Access Scope (Clean High-Contrast Text) */}
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fixed-slate-800 dark:text-fixed-slate-200">
                            <Eye
                              size={14}
                              className={isAllMenus ? 'text-fixed-purple-600 dark:text-fixed-purple-400' : 'text-fixed-indigo-600 dark:text-fixed-indigo-400'}
                            />
                            <span>{isAllMenus ? 'Full Access (All Modules)' : `${menuCount} Modules Active`}</span>
                          </span>
                        </td>

                        {/* Account Status (Clean Dot & Text) */}
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-fixed-slate-800 dark:text-fixed-slate-200">
                            <span className="w-2 h-2 rounded-full bg-fixed-emerald-500 shrink-0" />
                            <span>Active</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenDrawer(user);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-fixed-indigo-600 hover:bg-fixed-indigo-700 text-fixed-white transition-all cursor-pointer shadow-xs active:scale-95 border-0"
                            title="Configure module visibility and permissions"
                          >
                            <SlidersHorizontal size={12} />
                            <span>Configure Access</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Slide-over Drawer for Permissions Governance ────────────────────────── */}
        <UserAccessDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          user={selectedUser}
          onSaved={() => fetchUsers(true)}
        />
      </div>
    </div>
  );
}
