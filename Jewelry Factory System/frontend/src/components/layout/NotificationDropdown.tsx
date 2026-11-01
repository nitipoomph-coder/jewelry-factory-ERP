import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Package, AlertCircle, Info, Sparkles } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'order' | 'inventory' | 'system';
}

// Mock initial notifications data
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'PO #PO-2026-088 Fully Approved',
    message: 'Procurement approved PO. Ready for receiving. (SRA)',
    timestamp: '10 minutes ago',
    read: false,
    type: 'order',
  },
  {
    id: 'notif-2',
    title: 'Stone requisitioned Gem Issue (SIA) New',
    message: 'Production requisition stone for order #ORD-4421 45 pcs',
    timestamp: '1 hours ago',
    read: false,
    type: 'order',
  },
  {
    id: 'notif-3',
    title: 'Material Gem Emerald up to Safety Stock',
    message: 'Main warehouse stock below 100 ct. PR recommended. (SPA)',
    timestamp: '3 hours ago',
    read: false,
    type: 'inventory',
  },
  {
    id: 'notif-4',
    title: 'Weekly system backup completed',
    message: 'System ERP created Snapshot Sunday database backup completed 100%',
    timestamp: 'Yesterday',
    read: true,
    type: 'system',
  },
];

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * TODO: Connect to Real-time Backend Notification API
   * Recommended endpoints:
   *  - GET /api/notifications -> fetch paginated notifications
   *  - PATCH /api/notifications/:id/read -> mark single notification as read
   *  - POST /api/notifications/mark-all-read -> mark all as read
   *  - WebSocket or SSE -> push real-time event updates to client
   */
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(item => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border-none cursor-pointer transition-colors ${
          isOpen
            ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
            : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)]'
        }`}
        title="Notifications (Notifications)"
        aria-label="Open notifications panel"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-[var(--color-overlay-text)] bg-[var(--color-danger-500)] shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Popup Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] rounded-xl border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] shadow-[var(--shadow-dropdown)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-light)] bg-[var(--color-surface-0)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-600)]">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-brand-600)] hover:underline border-none bg-transparent cursor-pointer p-0"
              >
                <CheckCheck size={13} /> Read All
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-[var(--color-border-light)]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--color-text-tertiary)]">
                <Sparkles size={24} className="mb-2 opacity-50 text-[var(--color-brand-500)]" />
                <span className="text-xs font-semibold">No new notifications</span>
              </div>
            ) : (
              notifications.map((item) => {
                const IconComponent =
                  item.type === 'order'
                    ? Package
                    : item.type === 'inventory'
                    ? AlertCircle
                    : Info;

                const iconColor =
                  item.type === 'order'
                    ? 'text-[var(--color-brand-600)] bg-[var(--color-brand-50)]'
                    : item.type === 'inventory'
                    ? 'text-[var(--color-warning-600)] bg-[var(--color-warning-50)]'
                    : 'text-[var(--color-text-tertiary)] bg-[var(--color-surface-2)]';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMarkAsRead(item.id)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left border-none cursor-pointer transition-colors ${
                      !item.read
                        ? 'bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)]'
                        : 'bg-transparent hover:bg-[var(--color-surface-1)] opacity-75'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor} mt-0.5`}
                    >
                      <IconComponent size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs truncate ${
                            !item.read
                              ? 'font-bold text-[var(--color-text-primary)]'
                              : 'font-semibold text-[var(--color-text-secondary)]'
                          }`}
                        >
                          {item.title}
                        </span>
                        {!item.read && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: 'var(--color-brand-500)' }}
                          />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="mt-1.5 block text-[10px] font-medium text-[var(--color-text-tertiary)]">
                        {item.timestamp}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Notice */}
          <div className="border-t border-[var(--color-border-light)] bg-[var(--color-surface-0)] px-4 py-2 text-center text-[10px] text-[var(--color-text-tertiary)]">
            <span>Connected to system ERP Auto (Mock Data)</span>
          </div>
        </div>
      )}
    </div>
  );
}
