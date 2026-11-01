import { useState, useEffect } from 'react';
import {
  Users,
  RefreshCw,
  Radio,
  UserX,
  Shield,
  Search,
  AlertCircle,
  LayoutList,
  FileText,
  BarChart3,
  TrendingUp,
  Gem,
  Factory,
  Calendar,
  ScrollText,
  ShoppingCart,
  ClipboardList,
  FlaskConical,
  Handshake,
  Compass,
  Package,
  Image,
  UserCheck,
  ShieldAlert,
  Boxes,
  Eye,
} from 'lucide-react';
import { adminAuditAPI, type ActiveSession } from '../../services/adminAuditAPI';
import { useToast } from '../../contexts/ToastContext';

function renderPageIcon(iconName?: string) {
  switch (iconName) {
    case 'layout-list':
      return <LayoutList size={14} className="text-emerald-400 shrink-0" />;
    case 'file-text':
      return <FileText size={14} className="text-indigo-400 shrink-0" />;
    case 'bar-chart':
      return <BarChart3 size={14} className="text-blue-400 shrink-0" />;
    case 'trending-up':
      return <TrendingUp size={14} className="text-cyan-400 shrink-0" />;
    case 'gem':
      return <Gem size={14} className="text-purple-400 shrink-0" />;
    case 'factory':
      return <Factory size={14} className="text-amber-400 shrink-0" />;
    case 'calendar':
      return <Calendar size={14} className="text-orange-400 shrink-0" />;
    case 'users':
      return <Users size={14} className="text-indigo-400 shrink-0" />;
    case 'shield':
      return <Shield size={14} className="text-rose-400 shrink-0" />;
    case 'scroll-text':
      return <ScrollText size={14} className="text-slate-400 shrink-0" />;
    case 'shopping-cart':
      return <ShoppingCart size={14} className="text-yellow-400 shrink-0" />;
    case 'clipboard-list':
      return <ClipboardList size={14} className="text-emerald-400 shrink-0" />;
    case 'flask':
      return <FlaskConical size={14} className="text-teal-400 shrink-0" />;
    case 'handshake':
      return <Handshake size={14} className="text-blue-400 shrink-0" />;
    default:
      return <Compass size={14} className="text-[var(--color-text-muted)] shrink-0" />;
  }
}

function renderActionIcon(actionType?: string) {
  switch (actionType) {
    case 'search':
      return <Search size={13} className="text-amber-400 shrink-0" />;
    case 'order':
      return <Package size={13} className="text-emerald-400 shrink-0" />;
    case 'chart':
      return <BarChart3 size={13} className="text-blue-400 shrink-0" />;
    case 'photo':
      return <Image size={13} className="text-purple-400 shrink-0" />;
    case 'user':
      return <UserCheck size={13} className="text-indigo-400 shrink-0" />;
    case 'shield':
      return <ShieldAlert size={13} className="text-rose-400 shrink-0" />;
    case 'package':
      return <Boxes size={13} className="text-teal-400 shrink-0" />;
    default:
      return <Eye size={13} className="text-[var(--color-text-muted)] shrink-0" />;
  }
}

export default function ActiveSessionsPage() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Kill Session Modal state
  const [sessionToKill, setSessionToKill] = useState<ActiveSession | null>(null);
  const [isKilling, setIsKilling] = useState(false);

  const fetchSessions = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await adminAuditAPI.getSessions();
      setSessions(data);
    } catch (err: any) {
      console.error('[ActiveSessions] Fetch error:', err);
      showToast(err.message || 'Failed to load active sessions', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 10s auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSessions(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleKillSession = async () => {
    if (!sessionToKill) return;
    setIsKilling(true);

    try {
      const result = await adminAuditAPI.killSession(sessionToKill.sessionId);
      if (result.success) {
        showToast(`Session terminated for ${sessionToKill.username}`, 'success');
        setSessionToKill(null);
        await fetchSessions(true);
      } else {
        showToast(result.message || 'Failed to terminate session', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error terminating session', 'error');
    } finally {
      setIsKilling(false);
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.username.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.ip.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.pageTitle || '').toLowerCase().includes(q) ||
      (s.currentPage || '').toLowerCase().includes(q) ||
      (s.currentAction || '').toLowerCase().includes(q)
    );
  });

  const getActiveStatusBadge = (lastActiveAt: string) => {
    const diffMs = Date.now() - new Date(lastActiveAt).getTime();
    if (diffMs < 45000) {
      return {
        label: 'Active Now',
        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400 animate-ping',
      };
    } else if (diffMs < 300000) {
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      return {
        label: `Idle (${mins}m)`,
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    } else {
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      return {
        label: `Away (${mins}m)`,
        color: 'bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]',
        dot: 'bg-[var(--color-text-muted)]',
      };
    }
  };

  const poTrackerUsersCount = sessions.filter(s => (s.currentPage || '').includes('/po-tracker')).length;
  const matrixUsersCount = sessions.filter(s => (s.currentPage || '').includes('/customer')).length;

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full text-[var(--color-text-primary)] pb-12">
        {/* ─── Top Header Bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-blue-500/10 flex items-center justify-center text-emerald-500 shadow-xs">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] m-0">
                  Active User Sessions
                </h1>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 font-semibold">
                  {sessions.length} Online
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] m-0 mt-0.5">
                Monitor active enterprise user sessions, live page navigation, and operator activity.
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0 shadow-xs ${
                autoRefresh
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Radio size={13} className={autoRefresh ? 'animate-pulse text-emerald-500' : ''} />
              <span>{autoRefresh ? 'Live Sync (10s)' : 'Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchSessions(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs border-0 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-500' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ─── Search & Metrics Bar (Modern Clean) ─────────────────────────────────── */}
        <div className="bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl p-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by user, IP address, page, or query..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 transition-colors border border-slate-200/50 dark:border-slate-700/50"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto px-2">
            <span>
              Production: <strong className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{poTrackerUsersCount}</strong>
            </span>
            <span className="opacity-40">•</span>
            <span>
              Analytics: <strong className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{matrixUsersCount}</strong>
            </span>
            <span className="opacity-40">•</span>
            <span>
              Admins: <strong className="text-purple-600 dark:text-purple-400 font-mono font-semibold">{sessions.filter(s => s.role === 'admin').length}</strong>
            </span>
          </div>
        </div>

        {/* ─── Active Sessions Table (High Contrast & Clean Typography) ───────────── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl shadow-xs overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/70 dark:bg-slate-900/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
              Live Operator Sessions ({filteredSessions.length})
            </h2>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Real-time interface presence and navigation tracking
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50">
                  <th className="py-3 px-5 font-semibold">User</th>
                  <th className="py-3 px-5 font-semibold">Role</th>
                  <th className="py-3 px-5 font-semibold">Current Page</th>
                  <th className="py-3 px-5 font-semibold">Active Query</th>
                  <th className="py-3 px-5 font-semibold">Activity Status</th>
                  <th className="py-3 px-5 font-semibold">IP Address</th>
                  <th className="py-3 px-5 font-semibold">Login Time</th>
                  <th className="py-3 px-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white dark:bg-slate-900/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Loading live sessions...
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No active sessions found
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map(session => {
                    const statusBadge = getActiveStatusBadge(session.lastActiveAt);

                    return (
                      <tr key={session.sessionId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* User */}
                        <td className="py-3 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
                              {(session.name || session.username)[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white text-xs">{session.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">@{session.username}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role (Clean Text & Colored Icon, No Background Pill) */}
                        <td className="py-3 px-5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <Shield
                              size={14}
                              className={session.role === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}
                            />
                            <span>{session.role === 'admin' ? 'Administrator' : 'Sales / Operator'}</span>
                          </span>
                        </td>

                        {/* Current Page */}
                        <td className="py-3 px-5 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                              {renderPageIcon(session.pageIcon)}
                              <span>{session.pageTitle || 'Factory Overview'}</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 max-w-[200px] truncate" title={session.currentPage}>
                              {session.currentPage || '/'}
                            </span>
                          </div>
                        </td>

                        {/* Active Query */}
                        <td className="py-3 px-5 max-w-[280px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate" title={session.currentAction}>
                              {renderActionIcon(session.actionType)}
                              <span className="truncate">{session.currentAction || 'Browsing System'}</span>
                            </span>
                            {session.lastEndpoint && (
                              <span className="font-mono text-[10px] text-slate-400 truncate pl-4.5" title={session.lastEndpoint}>
                                {session.lastEndpoint}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Activity Status (Clean Dot & Text) */}
                        <td className="py-3 px-5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                            <span className={`w-2 h-2 rounded-full ${statusBadge.dot} shrink-0`} />
                            <span>{statusBadge.label}</span>
                          </span>
                        </td>

                        {/* IP Address */}
                        <td className="py-3 px-5 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400">
                          {session.ip}
                        </td>

                        {/* Login Time */}
                        <td className="py-3 px-5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-xs">
                          {new Date(session.createdAt).toLocaleTimeString('en-US', { hour12: false })}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-5 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => setSessionToKill(session)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs border-0 active:scale-95"
                            title="Terminate Session"
                          >
                            <UserX size={12} />
                            <span>Terminate</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Kill Session Confirmation Modal ────────────────────────────────────── */}
        {sessionToKill && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <AlertCircle size={20} />
                <span>Terminate User Session</span>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to forcibly terminate the session for{' '}
                <strong className="text-slate-900 dark:text-white">{sessionToKill.name}</strong> (@
                <span className="font-mono text-amber-600 dark:text-amber-400">{sessionToKill.username}</span>)?
                The user will be immediately signed out from all active interfaces.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSessionToKill(null)}
                  disabled={isKilling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border-0 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleKillSession}
                  disabled={isKilling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs transition-all disabled:opacity-50 border-0"
                >
                  {isKilling ? 'Terminating...' : 'Terminate Session'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
