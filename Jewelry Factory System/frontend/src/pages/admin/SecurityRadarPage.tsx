import { useState, useEffect, useTransition } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  RefreshCw,
  Flame,
  AlertTriangle,
  Users,
  Search,
  Filter,
  Eye,
  X,
  Play,
  Terminal,
  Ban,
  Unlock,
  Clock,
  Plus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminAuditAPI, type ThreatSummary, type AuditEvent, type BannedIP } from '../../services/adminAuditAPI';
import { useToast } from '../../contexts/ToastContext';

export default function SecurityRadarPage() {
  const { showToast } = useToast();
  const [, startTransition] = useTransition();

  const [summary, setSummary] = useState<ThreatSummary | null>(null);
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal detail & manual ban
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showManualBanModal, setShowManualBanModal] = useState(false);
  const [manualBanIp, setManualBanIp] = useState('');
  const [manualBanReason, setManualBanReason] = useState('');
  const [manualBanDuration, setManualBanDuration] = useState(15);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [sumData, logsData, bannedData] = await Promise.all([
        adminAuditAPI.getSummary(),
        adminAuditAPI.getLogs({ limit: 40, category: 'ALL' }),
        adminAuditAPI.getBannedIPs(),
      ]);
      startTransition(() => {
        setSummary(sumData);
        setLogs(logsData.items);
        setBannedIPs(bannedData);
      });
    } catch (err: any) {
      console.error('[SecurityRadar] Fetch error:', err);
      showToast(err.message || 'Failed to load security metrics', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh interval (every 10 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSimulate = async (type: string) => {
    setIsSimulating(true);
    try {
      await adminAuditAPI.simulateThreat(type);
      showToast(`Simulation triggered: ${type}`, 'success');
      await fetchData(true);
    } catch (err: any) {
      showToast(err.message || 'Simulation failed', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUnban = async (ip: string) => {
    try {
      const res = await adminAuditAPI.unbanIP(ip);
      showToast(res.message || `IP ${ip} released from jail`, 'success');
      await fetchData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to unban IP', 'error');
    }
  };

  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBanIp.trim()) {
      showToast('IP address is required', 'error');
      return;
    }
    try {
      const res = await adminAuditAPI.banIP(
        manualBanIp.trim(),
        manualBanReason.trim() || 'Manual admin ban',
        manualBanDuration
      );
      showToast(res.message || `IP ${manualBanIp} banned successfully`, 'success');
      setShowManualBanModal(false);
      setManualBanIp('');
      setManualBanReason('');
      await fetchData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to ban IP', 'error');
    }
  };

  // Filter logs for table
  const filteredLogs = logs.filter(item => {
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inAction = item.action.toLowerCase().includes(q);
      const inActor = item.actor.toLowerCase().includes(q);
      const inIp = item.ip.toLowerCase().includes(q);
      const inDetails = JSON.stringify(item.details).toLowerCase().includes(q);
      return inAction || inActor || inIp || inDetails;
    }
    return true;
  });

  const getThreatBadge = (level: string = 'NORMAL') => {
    switch (level) {
      case 'UNDER_ATTACK':
        return {
          label: 'CRITICAL / UNDER ATTACK',
          cardBg: 'from-rose-500/15 via-rose-500/5 to-transparent',
          textColor: 'text-rose-600 dark:text-rose-400',
          barColor: '#f43f5e',
          icon: Flame,
        };
      case 'ELEVATED':
        return {
          label: 'ELEVATED THREAT',
          cardBg: 'from-amber-500/15 via-amber-500/5 to-transparent',
          textColor: 'text-amber-600 dark:text-amber-400',
          barColor: '#f59e0b',
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'NORMAL / DEFENDED',
          cardBg: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          barColor: '#10b981',
          icon: ShieldCheck,
        };
    }
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-semibold';
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold';
    }
  };

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case 'BLOCKED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold';
      case 'FAILED':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold';
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold';
    }
  };

  const threatBadge = getThreatBadge(summary?.threatLevel);
  const ThreatIcon = threatBadge.icon;

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full text-[var(--color-text-primary)] pb-12">
        {/* ─── Top Header Bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/20 via-orange-500/15 to-amber-500/10 flex items-center justify-center text-rose-500 shadow-xs">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] m-0">
                  Security & Threat Radar
                </h1>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 font-semibold">
                  Zero-DB Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] m-0 mt-0.5">
                Live cyber threat detection, authentication auditing, and anomaly monitoring.
              </p>
            </div>
          </div>

          {/* Live Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0 shadow-xs ${
                autoRefresh
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
              title="Auto-refresh every 10s"
            >
              <Radio size={13} className={autoRefresh ? 'animate-pulse text-emerald-500' : ''} />
              <span>{autoRefresh ? 'Live Sync (10s)' : 'Live Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs border-0 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-500' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ─── Threat Status Banner & KPIs (Clean Modern Grid) ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Threat Level Gauge (Left 4 cols) */}
          <div
            className={`lg:col-span-4 rounded-2xl p-5 flex flex-col justify-between shadow-xs border border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-br ${threatBadge.cardBg} bg-white dark:bg-slate-900/60 relative overflow-hidden`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                Current Threat Status
              </span>
              <div className="flex items-center gap-1.5">
                <ThreatIcon size={16} className={threatBadge.textColor} />
                <span className={`text-xs font-bold ${threatBadge.textColor}`}>
                  {threatBadge.label}
                </span>
              </div>
            </div>

            <div className="my-4">
              <div className="flex items-baseline gap-2.5">
                <span className={`text-4xl sm:text-5xl font-black tracking-tight ${threatBadge.textColor}`}>
                  {summary?.threatScore ?? 0}
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-400">/ 100 Threat Score</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(5, summary?.threatScore ?? 0))}%`,
                    backgroundColor: threatBadge.barColor,
                  }}
                />
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
              <span>Evaluated over last 24h</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                Memory + Local JSON
              </span>
            </div>
          </div>

          {/* KPI Tiles (Right 8 cols) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Failed Logins */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Failed Logins</span>
                <AlertTriangle size={15} className="text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 my-1 font-mono">
                {summary?.kpis.failedLogins24h ?? 0}
              </div>
              <div className="text-[11px] text-slate-400">Brute force indicator</div>
            </div>

            {/* Master Admin Probes */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Admin Probes</span>
                <ShieldAlert size={15} className="text-rose-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 my-1 font-mono">
                {summary?.kpis.adminProbes24h ?? 0}
              </div>
              <div className="text-[11px] text-slate-400">Password guesses</div>
            </div>

            {/* Rate Limit Blocks */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Flood Throttles</span>
                <Flame size={15} className="text-orange-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 my-1 font-mono">
                {summary?.kpis.rateLimitHits24h ?? 0}
              </div>
              <div className="text-[11px] text-slate-400">HTTP 429 triggered</div>
            </div>

            {/* Active Sessions */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Active Users</span>
                <Users size={15} className="text-emerald-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 my-1 font-mono">
                {summary?.kpis.activeSessionsNow ?? 0}
              </div>
              <div className="text-[11px] text-slate-400">Live in memory</div>
            </div>

            {/* Auto-Banned IPs in Jail */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs border border-slate-200/50 dark:border-slate-800/50 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>IPs in Jail</span>
                <Ban size={15} className={bannedIPs.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
              </div>
              <div className={`text-2xl sm:text-3xl font-bold my-1 font-mono ${bannedIPs.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {bannedIPs.length}
              </div>
              <div className="text-[11px] text-slate-400">Auto-ban defense</div>
            </div>
          </div>
        </div>

        {/* ─── 24h Timeline Chart & Attack Vector Breakdown ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Activity Timeline (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900/60 rounded-2xl p-5 shadow-xs flex flex-col border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
                  24-Hour Attack & Activity Timeline
                </h2>
                <p className="text-xs text-slate-400 m-0 mt-0.5">
                  Comparison of normal requests vs security threats detected
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Threats</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Auth Events</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              {summary?.timeline && summary.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="authGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="hour"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="threats"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#threatGrad)"
                      name="Threats"
                    />
                    <Area
                      type="monotone"
                      dataKey="auth"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#authGrad)"
                      name="Auth Events"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No timeline data available
                </div>
              )}
            </div>
          </div>

          {/* Attack Vector Breakdown (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between border border-slate-200/50 dark:border-slate-800/50">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
                Attack Vectors Breakdown
              </h2>
              <p className="text-xs text-slate-400 m-0 mb-4 mt-0.5">
                Distribution of blocked attempts
              </p>

              <div className="flex flex-col gap-3">
                {summary?.attackVectors.map(vec => (
                  <div key={vec.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{vec.name}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{vec.count}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (vec.count / Math.max(1, summary?.kpis.totalEvents24h || 1)) * 100)}%`,
                          backgroundColor: vec.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Threat Simulator Drawer for Testing Verification */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2.5 font-semibold">
                <Terminal size={14} className="text-indigo-500" />
                <span>Diagnostic Threat Simulator</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulate('BRUTE_FORCE')}
                  disabled={isSimulating}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs border-0"
                >
                  <Play size={11} className="text-amber-500" />
                  <span>Simulate Brute</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('ADMIN_PROBE')}
                  disabled={isSimulating}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs border-0"
                >
                  <Play size={11} className="text-rose-500" />
                  <span>Admin Probe</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('PATH_TRAVERSAL')}
                  disabled={isSimulating}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs border-0"
                >
                  <Play size={11} className="text-purple-500" />
                  <span>Path Probe</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulate('RATE_LIMIT')}
                  disabled={isSimulating}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs border-0"
                >
                  <Play size={11} className="text-orange-500" />
                  <span>Rate Flood</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Auto-Banned IPs (IP Jail Defense) ─────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl shadow-xs overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50">
          <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/70 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-500">
                <Ban size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
                    Auto-Banned IPs (IP Jail Defense)
                  </h2>
                  <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold ${
                    bannedIPs.length > 0
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {bannedIPs.length} {bannedIPs.length === 1 ? 'Jailed IP' : 'Jailed IPs'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 m-0 mt-0.5">
                  Automatic protection triggered after 5 failed login attempts in 10 minutes (Blocked with 403 at gateway).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowManualBanModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all cursor-pointer shadow-xs border-0 self-start sm:self-auto"
            >
              <Plus size={13} />
              <span>Manual Ban IP</span>
            </button>
          </div>

          {bannedIPs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <ShieldCheck size={36} className="text-emerald-500 opacity-80" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">IP Jail is Empty</div>
              <p className="text-xs text-slate-500 max-w-md m-0">
                No IP addresses are currently blocked. Normal traffic flows freely without restriction.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50">
                    <th className="py-3 px-5 font-semibold">Banned IP</th>
                    <th className="py-3 px-5 font-semibold">Violation Reason</th>
                    <th className="py-3 px-5 font-semibold">Banned At</th>
                    <th className="py-3 px-5 font-semibold">Time Remaining</th>
                    <th className="py-3 px-5 font-semibold">Enforced By</th>
                    <th className="py-3 px-5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white dark:bg-slate-900/30">
                  {bannedIPs.map(item => (
                    <tr key={item.ip} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-5 font-mono font-bold text-rose-600 dark:text-rose-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                          {item.ip}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={item.reason}>
                        {item.reason}
                      </td>
                      <td className="py-3 px-5 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-xs">
                        {new Date(item.bannedAt).toLocaleTimeString('th-TH')} ({new Date(item.bannedAt).toLocaleDateString()})
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Clock size={12} />
                          ~{item.minutesRemaining} min left
                        </span>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.bannedBy}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleUnban(item.ip)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-xs border-0 active:scale-95"
                        >
                          <Unlock size={12} />
                          <span>Unblock / ปลดแบน</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Live Threat Stream Table ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl shadow-xs overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50">
          {/* Table Toolbar */}
          <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/70 dark:bg-slate-900/80">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">
                Live Threat & Audit Event Stream ({filteredLogs.length})
              </h2>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Real-time chronological events intercepted by security middleware
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Input */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search IP, User, Action..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-indigo-500/30 w-44 sm:w-52"
                />
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1">
                <Filter size={13} className="text-slate-400" />
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical Only</option>
                  <option value="HIGH">High Only</option>
                  <option value="MEDIUM">Medium Only</option>
                  <option value="LOW">Low Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50">
                  <th className="py-3 px-5 font-semibold">Severity</th>
                  <th className="py-3 px-5 font-semibold">Time</th>
                  <th className="py-3 px-5 font-semibold">Source IP</th>
                  <th className="py-3 px-5 font-semibold">Action</th>
                  <th className="py-3 px-5 font-semibold">Actor / User</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white dark:bg-slate-900/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-rose-500" />
                        <span>Loading security stream...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <ShieldAlert size={28} className="text-slate-400 opacity-60" />
                        <span className="text-xs font-medium">No threat events matching filter</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(item => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedEvent(item)}
                    >
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${getSeverityBadgeClass(item.severity)}`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {new Date(item.timestamp).toLocaleTimeString('th-TH')}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap font-mono text-slate-800 dark:text-slate-200 font-semibold text-xs">
                        {item.ip}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-xs">
                          {item.action}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                        {item.actor}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(item);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title="View Full Payload"
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
        </div>

        {/* ─── Detail Modal ───────────────────────────────────────────────────────── */}
        {selectedEvent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col gap-4 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${getSeverityBadgeClass(selectedEvent.severity)}`}>
                    {selectedEvent.severity}
                  </span>
                  <h3 className="text-base font-bold m-0 font-mono text-slate-900 dark:text-white">{selectedEvent.action}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Event ID:</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">{selectedEvent.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Timestamp:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(selectedEvent.timestamp).toLocaleString('th-TH')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Source IP:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{selectedEvent.ip}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Actor:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEvent.actor}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1.5 font-medium">Payload & Details:</span>
                <pre className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto max-h-48 border border-slate-200/60 dark:border-slate-800/60">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors border-0"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal: Manual Ban IP ────────────────────────────────────────────── */}
        {showManualBanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <Ban size={18} />
                  <span>Manual Ban IP to Jail</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualBanModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleManualBan} className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-300 block mb-1 font-medium">IP Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192.168.1.50"
                    value={manualBanIp}
                    onChange={e => setManualBanIp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono outline-hidden focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-300 block mb-1 font-medium">Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Suspicious automated scanning"
                    value={manualBanReason}
                    onChange={e => setManualBanReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-300 block mb-1 font-medium">Duration (Minutes)</label>
                  <select
                    value={manualBanDuration}
                    onChange={e => setManualBanDuration(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={180}>3 Hours</option>
                    <option value={1440}>24 Hours</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowManualBanModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border-0 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs transition-all border-0"
                  >
                    Confirm Ban
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
