import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { adminAuditAPI, type AuditEvent } from '../../services/adminAuditAPI';
import { useToast } from '../../contexts/ToastContext';

export default function AuditLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [severity, setSeverity] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState<AuditEvent | null>(null);

  // Clear Logs State
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const res = await adminAuditAPI.clearLogs();
      showToast(res.message || 'Audit logs have been cleared', 'success');
      setShowClearModal(false);
      await fetchLogs(1);
    } catch (err: any) {
      showToast(err.message || 'Failed to clear logs', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const fetchLogs = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const data = await adminAuditAPI.getLogs({
        page: targetPage,
        limit: 50,
        category,
        severity,
        status,
        search,
        fromDate,
        toDate,
      });
      setLogs(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error('[AuditLogs] Fetch error:', err);
      showToast(err.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [category, severity, status, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('ALL');
    setSeverity('ALL');
    setStatus('ALL');
    setFromDate('');
    setToDate('');
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      showToast('No logs to export', 'info');
      return;
    }

    const headers = ['Timestamp', 'Severity', 'Category', 'Action', 'Actor', 'IP', 'Status', 'Details'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toISOString(),
      l.severity,
      l.category,
      l.action,
      l.actor,
      l.ip,
      l.status,
      `"${JSON.stringify(l.details).replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported audit logs to CSV', 'success');
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    }
  };

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case 'BLOCKED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      case 'FAILED':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'WARNING':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    }
  };

  const hasActiveFilters = category !== 'ALL' || severity !== 'ALL' || status !== 'ALL' || fromDate || toDate || search.trim();

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full text-[var(--color-text-primary)] pb-12">
        {/* ─── Top Header Bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-blue-500/10 flex items-center justify-center text-indigo-500 shadow-xs">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] m-0">
                  System Audit Trail & History
                </h1>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 font-semibold">
                  {total} Total Logs
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] m-0 mt-0.5">
                Complete chronological audit trail for logins, permissions, data modifications, and security events.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs border-0"
              title="Export filtered records to CSV file"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLogs(page)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs border-0 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-indigo-500' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all cursor-pointer shadow-xs border-0"
            >
              <Trash2 size={13} />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>

        {/* ─── Search & Multi-Filter Bar (Modern Clean) ────────────────────────────── */}
        <div className="bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl p-2.5 shadow-xs flex flex-col gap-2.5">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by action, user, IP, or payload keyword..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 transition-colors border border-slate-200/50 dark:border-slate-700/50"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs transition-colors shrink-0"
            >
              Search Records
            </button>
          </form>

          {/* Filter Pills & Selects */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Filter size={13} />
              <span className="font-medium text-[11px]">Filters:</span>
            </div>

            {/* Category Select */}
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="py-1 px-2.5 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 outline-hidden focus:ring-1 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="AUTH">Authentication (AUTH)</option>
              <option value="SECURITY">Security Threats (SECURITY)</option>
              <option value="DATA_CHANGE">Data Changes (DATA_CHANGE)</option>
              <option value="SYSTEM">System Events (SYSTEM)</option>
            </select>

            {/* Severity Select */}
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="py-1 px-2.5 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 outline-hidden focus:ring-1 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Select */}
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="py-1 px-2.5 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 outline-hidden focus:ring-1 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="BLOCKED">Blocked</option>
              <option value="WARNING">Warning</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar size={13} className="text-slate-400" />
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="py-1 px-2 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 outline-hidden"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="py-1 px-2 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 outline-hidden"
              />

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer ml-1"
                  title="Reset all filters"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Audit Trail Records Table (High Contrast & Clean Typography) ────────── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl shadow-xs overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/70 dark:bg-slate-900/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
              Security & Operational Trail ({logs.length} of {total} Records)
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Page <strong className="text-slate-800 dark:text-slate-200 font-semibold">{page}</strong> of{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">{totalPages}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50">
                  <th className="py-3 px-5 font-semibold">Severity</th>
                  <th className="py-3 px-5 font-semibold">Timestamp</th>
                  <th className="py-3 px-5 font-semibold">Category</th>
                  <th className="py-3 px-5 font-semibold">Action</th>
                  <th className="py-3 px-5 font-semibold">Actor</th>
                  <th className="py-3 px-5 font-semibold">IP Address</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white dark:bg-slate-900/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-indigo-500" />
                        <span>Loading audit records...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText size={32} className="text-slate-400 opacity-60" />
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          No Audit Records Found
                        </div>
                        <p className="text-xs text-slate-500 m-0">
                          No audit entries match the current filter criteria.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Severity */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getSeverityBadgeClass(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-5 whitespace-nowrap font-mono text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(log.timestamp).toLocaleString('th-TH')}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {log.category}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-5 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100 font-mono text-xs">
                        {log.action}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-5 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                        {log.actor}
                      </td>

                      {/* IP Address */}
                      <td className="py-3 px-5 whitespace-nowrap font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {log.ip}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>

                      {/* Details View */}
                      <td className="py-3 px-5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title="View Full Record"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-5 py-3.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing Page <strong className="text-slate-800 dark:text-slate-200 font-semibold">{page}</strong> of{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">{totalPages}</strong> ({total} entries)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => fetchLogs(page - 1)}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer shadow-xs border border-slate-200/50 dark:border-slate-700/50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-mono font-semibold text-slate-800 dark:text-slate-200">{page}</span>
              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => fetchLogs(page + 1)}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer shadow-xs border border-slate-200/50 dark:border-slate-700/50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Detail Modal ───────────────────────────────────────────────────────── */}
        {selectedLog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setSelectedLog(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative flex flex-col gap-4 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getSeverityBadgeClass(selectedLog.severity)}`}>
                    {selectedLog.severity}
                  </span>
                  <h3 className="text-base font-bold m-0 text-slate-900 dark:text-white font-mono">{selectedLog.action}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Event ID:</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Timestamp:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(selectedLog.timestamp).toLocaleString('th-TH')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Actor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.actor}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Client IP:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedLog.ip}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Category:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{selectedLog.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${getStatusBadgeClass(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1.5 font-medium">Payload / Details:</span>
                <pre className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto max-h-56 border border-slate-200/60 dark:border-slate-800/60">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors border-0"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Clear Logs Confirmation Modal ────────────────────────────────────── */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Clear All Audit Logs?</h3>
                  <p className="text-xs text-slate-500 m-0">Irreversible security maintenance action</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently clear all audit trail records? All login events, security alerts, and activity logs will be wiped from memory and disk.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  disabled={isClearing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border-0 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={isClearing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 border-0"
                >
                  <Trash2 size={13} className={isClearing ? 'animate-spin' : ''} />
                  <span>{isClearing ? 'Clearing...' : 'Confirm Clear Logs'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
