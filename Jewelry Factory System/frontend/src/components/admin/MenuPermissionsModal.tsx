import { useState, useMemo } from 'react';
import {
  X,
  CheckSquare,
  Square,
  MinusSquare,
  ShieldCheck,
  Save,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { menuConfig } from '../../config/menuConfig';
import { adminUsersAPI, type ManagedUser } from '../../services/adminUsersAPI';
import { useToast } from '../../contexts/ToastContext';

interface MenuPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser;
  onSaved: () => void;
}

// Preset templates for common roles
const PRESETS: Record<string, { label: string; ids: string[] }> = {
  admin: {
    label: 'Admin (All)',
    ids: ['*'],
  },
  sales: {
    label: 'Sales Template',
    ids: [
      'sales-dashboard',
      'dash-cust',
      'dash-matrix',
      'dash-top-orders',
      'dash-top-orders-analytics',
      'order-tracker',
      'po-tracker',
    ],
  },
  production: {
    label: 'Production Template',
    ids: [
      'order-tracker',
      'po-tracker',
      'pro-sum',
      'pro-forecast',
      'fbe-order-track',
      'subcontract',
      'sub-vendor-performance',
      'sub-vendor-price',
      'sub-aging',
    ],
  },
  stock: {
    label: 'Stock Template',
    ids: [
      'inventory',
      'check-dispatch',
      'check-sample',
      'check-purchase',
      'audit',
      'check-stock',
      'check-status',
      'spare-parts',
      'sp-order',
      'sp-issue',
      'sp-receive',
      'sp-check-stock',
      'sp-summary-stock',
      'sp-check-item',
      'sp-check-status',
    ],
  },
};

export default function MenuPermissionsModal({
  isOpen,
  onClose,
  user,
  onSaved,
}: MenuPermissionsModalProps) {
  const { showToast } = useToast();

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

  // Initialize selected IDs
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const raw = user.allowedMenus || [];
    if (raw.includes('*')) {
      return [...allItemIds];
    }
    return [...raw];
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const isAllSelected = allItemIds.length > 0 && allItemIds.every(id => selectedIds.includes(id));

  // Toggle specific item
  const handleToggleItem = (itemId: string, groupId: string) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(itemId);
      let next = isSelected ? prev.filter(id => id !== itemId) : [...prev, itemId];

      // If item was checked, ensure parent group is also in the list so group shows
      if (!isSelected && !next.includes(groupId)) {
        next.push(groupId);
      }
      return next;
    });
  };

  // Toggle all items in a group
  const handleToggleGroup = (groupId: string, childIds: string[]) => {
    setSelectedIds(prev => {
      const allGroupIds = [groupId, ...childIds];
      const allSelected = allGroupIds.every(id => prev.includes(id));

      if (allSelected) {
        // Deselect group and its children
        return prev.filter(id => !allGroupIds.includes(id));
      } else {
        // Select group and all children
        const combined = new Set([...prev, ...allGroupIds]);
        return Array.from(combined);
      }
    });
  };

  // Select all menus
  const handleSelectAll = () => {
    setSelectedIds([...allItemIds]);
  };

  // Clear all menus
  const handleClearAll = () => {
    setSelectedIds([]);
  };

  // Apply preset
  const handleApplyPreset = (key: keyof typeof PRESETS) => {
    const preset = PRESETS[key];
    if (preset.ids.includes('*')) {
      setSelectedIds([...allItemIds]);
    } else {
      setSelectedIds([...preset.ids]);
    }
  };

  // Save permissions
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If all items selected, we can store ['*'] or exact IDs
      const toSave = isAllSelected ? ['*'] : selectedIds;
      const res = await adminUsersAPI.updateUserPermissions(user.username, toSave);

      showToast(res.message || 'บันทึกสิทธิ์การมองเห็นเมนูสำเร็จ', 'success');

      // If editing current logged-in user, sync with localStorage immediately
      const currentUser = (localStorage.getItem('auth_user') || '').toUpperCase();
      if (currentUser === user.username.toUpperCase()) {
        localStorage.setItem('auth_allowed_menus', JSON.stringify(toSave));
        // Trigger storage event so sidebar re-renders immediately
        window.dispatchEvent(new Event('storage'));
      }

      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shadow-xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-main)] m-0">
                  กำหนดสิทธิ์การมองเห็นเมนู (Menu Visibility)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  @{user.username}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
                เลือกเมนูที่ต้องการให้บัญชีผู้ใช้นี้มองเห็นบน Navigation Sidebar (บันทึก Zero-DB)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Toolbar: Quick Presets & Counters ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:px-5 bg-[var(--color-surface-2)] border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-[var(--color-text-muted)]">สิทธิ์ที่เลือก:</span>
            <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              {isAllSelected ? 'ทั้งหมด (All Menus)' : `${selectedIds.length} / ${allItemIds.length} เมนู`}
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-md font-medium bg-[var(--color-ui-surface)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer"
            >
              เลือกทั้งหมด
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 rounded-md font-medium bg-[var(--color-ui-surface)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer"
            >
              ล้างทั้งหมด
            </button>
            <span className="h-4 w-[1px] bg-[var(--color-border-subtle)] mx-0.5" />
            <button
              type="button"
              onClick={() => handleApplyPreset('sales')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all cursor-pointer"
              title="ตั้งค่าสิทธิ์เริ่มต้นสำหรับฝ่ายขาย (Sales Analytics, PO Tracker)"
            >
              <Sparkles size={11} />
              <span>Sales Preset</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('production')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 transition-all cursor-pointer"
              title="ตั้งค่าสิทธิ์สำหรับฝ่ายผลิต"
            >
              <Sparkles size={11} />
              <span>Production Preset</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('stock')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 transition-all cursor-pointer"
              title="ตั้งค่าสิทธิ์สำหรับฝ่ายคลัง/อะไหล่"
            >
              <Sparkles size={11} />
              <span>Stock Preset</span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Menu Checklist ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 flex flex-col gap-4">
          {menuConfig.map(group => {
            const childIds = (group.items || []).map(i => i.id);
            const groupSelectedCount = childIds.filter(id => selectedIds.includes(id)).length;
            const isGroupFullySelected =
              childIds.length > 0
                ? groupSelectedCount === childIds.length && selectedIds.includes(group.id)
                : selectedIds.includes(group.id);
            const isGroupPartiallySelected =
              groupSelectedCount > 0 && groupSelectedCount < childIds.length;

            return (
              <div
                key={group.id}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-ui-surface)] overflow-hidden shadow-xs"
              >
                {/* Group Header */}
                <div
                  onClick={() => handleToggleGroup(group.id, childIds)}
                  className={`flex items-center justify-between p-3 border-b border-[var(--color-border-subtle)] cursor-pointer select-none transition-colors ${
                    isGroupFullySelected
                      ? 'bg-indigo-500/10'
                      : isGroupPartiallySelected
                      ? 'bg-indigo-500/5'
                      : 'bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      className="text-indigo-400 cursor-pointer"
                      aria-label="Toggle group selection"
                    >
                      {isGroupFullySelected ? (
                        <CheckSquare size={16} />
                      ) : isGroupPartiallySelected ? (
                        <MinusSquare size={16} />
                      ) : (
                        <Square size={16} className="text-[var(--color-text-muted)] opacity-60" />
                      )}
                    </button>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-[var(--color-text-main)]">
                        {group.label}
                      </span>
                      {group.section && (
                        <span className="ml-2 text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                          {group.section}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {childIds.length > 0 ? (
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        {groupSelectedCount} / {childIds.length} รายการ
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        หน้าเดี่ยว ({group.path})
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-items (if any) */}
                {group.items && group.items.length > 0 && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 bg-[var(--color-surface-0)]">
                    {group.items.map(item => {
                      const isChecked = selectedIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-[var(--color-text-main)] shadow-xs'
                              : 'bg-[var(--color-ui-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-default)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem(item.id, group.id)}
                              className="accent-indigo-500 cursor-pointer w-3.5 h-3.5 rounded"
                            />
                            <span className="text-xs font-medium truncate">{item.label}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.code && (
                              <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                                {item.code}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)] opacity-60">
                              {item.path}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:px-5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <Info size={13} className="text-indigo-400 shrink-0" />
            <span>ปลอดภัย: สิทธิ์บันทึกใน Application Layer (Zero-DB) ไม่แตะต้องฐานข้อมูล MSSQL</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RotateCcw size={13} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>บันทึกสิทธิ์การมองเห็นเมนู</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
