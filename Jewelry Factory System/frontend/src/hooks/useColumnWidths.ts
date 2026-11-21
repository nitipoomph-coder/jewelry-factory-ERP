// User-resizable table columns, remembered per signed-in user and per table in this browser.
//
// - Drag the handle on a header's right edge (mouse, pen or touch), double-click it to reset that
//   column, or focus it and use ArrowLeft / ArrowRight (Shift = bigger steps), Delete to reset.
// - While dragging, only the <col> element and the table width are changed directly, so the
//   table body is not re-rendered on every pointer move; the width is saved once on release.
// - Saved in localStorage as overrides only ({ columnKey: width }), keyed by the username in the
//   login token (auth_user can be renamed from the profile menu, the token username cannot).
import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

export interface ColumnWidthOptions {
  minWidth?: number;
  maxWidth?: number;
}

const STORAGE_PREFIX = 'table-col-widths:v1';
const KEY_STEP = 10;
const KEY_STEP_LARGE = 50;

// Username from the JWT payload (display only, not verified here — it only picks a storage key).
function currentUserKey(): string {
  try {
    const token = localStorage.getItem('auth_token') || '';
    const payload = token.split('.')[1];
    if (payload) {
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (json && typeof json.username === 'string' && json.username) return json.username.toUpperCase();
    }
  } catch { /* fall back below */ }
  try {
    return (localStorage.getItem('auth_user') || 'anonymous').toUpperCase();
  } catch {
    return 'anonymous';
  }
}

export function useColumnWidths(tableId: string, defaults: Record<string, number>, options: ColumnWidthOptions = {}) {
  const minWidth = options.minWidth ?? 48;
  const maxWidth = options.maxWidth ?? 800;
  const clamp = useCallback((w: number) => Math.round(Math.min(maxWidth, Math.max(minWidth, w))), [minWidth, maxWidth]);

  const storageKey = useMemo(() => `${STORAGE_PREFIX}:${currentUserKey()}:${tableId}`, [tableId]);

  const [overrides, setOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const clean: Record<string, number> = {};
      for (const [key, value] of Object.entries(saved ?? {})) {
        if (key in defaults && typeof value === 'number' && Number.isFinite(value)) clean[key] = clamp(value);
      }
      return clean;
    } catch {
      return {};
    }
  });

  const save = useCallback((next: Record<string, number>) => {
    try {
      if (Object.keys(next).length === 0) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(next));
    } catch { /* storage blocked: widths still apply for this visit */ }
  }, [storageKey]);

  const getWidth = useCallback((key: string) => overrides[key] ?? defaults[key] ?? 100, [overrides, defaults]);
  const totalWidth = useMemo(() => Object.keys(defaults).reduce((sum, key) => sum + getWidth(key), 0), [defaults, getWidth]);

  const commit = useCallback((key: string, width: number | null) => {
    setOverrides(prev => {
      const next = { ...prev };
      if (width === null || width === defaults[key]) delete next[key];
      else next[key] = width;
      save(next);
      return next;
    });
  }, [defaults, save]);

  const resetAll = useCallback(() => {
    setOverrides({});
    save({});
  }, [save]);

  // Direct DOM access for live dragging.
  const tableRef = useRef<HTMLTableElement | null>(null);
  const colEls = useRef(new Map<string, HTMLTableColElement>());
  const colRef = useCallback((key: string) => (el: HTMLTableColElement | null) => {
    if (el) colEls.current.set(key, el);
    else colEls.current.delete(key);
  }, []);

  const startResize = useCallback((key: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = getWidth(key);
    const baseTotal = totalWidth - startWidth;
    let width = startWidth;
    let frame = 0;
    handle.setPointerCapture(event.pointerId);
    handle.dataset.active = 'true';
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const apply = () => {
      frame = 0;
      const col = colEls.current.get(key);
      if (col) col.style.width = `${width}px`;
      if (tableRef.current) tableRef.current.style.width = `${baseTotal + width}px`;
    };
    const onMove = (e: PointerEvent) => {
      width = clamp(startWidth + e.clientX - startX);
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onEnd = () => {
      if (frame) cancelAnimationFrame(frame);
      apply();
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      delete handle.dataset.active;
      if (width !== startWidth) commit(key, width);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  }, [clamp, commit, getWidth, totalWidth]);

  const onHandleKeyDown = useCallback((key: string, event: ReactKeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      commit(key, clamp(getWidth(key) + (event.key === 'ArrowRight' ? step : -step)));
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      commit(key, null);
    }
  }, [clamp, commit, getWidth]);

  // Props for the resize handle inside a header cell.
  const handleProps = useCallback((key: string, label: string) => ({
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    'aria-label': `Resize ${label} column`,
    'aria-valuenow': getWidth(key),
    'aria-valuemin': minWidth,
    'aria-valuemax': maxWidth,
    tabIndex: 0,
    title: 'Drag to resize · double-click to reset',
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => startResize(key, e),
    onDoubleClick: (e: React.MouseEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); commit(key, null); },
    onClick: (e: React.MouseEvent<HTMLElement>) => e.stopPropagation(),
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => onHandleKeyDown(key, e),
  }), [commit, getWidth, maxWidth, minWidth, onHandleKeyDown, startResize]);

  return {
    getWidth,
    totalWidth,
    tableRef,
    colRef,
    handleProps,
    resetAll,
    isCustomized: Object.keys(overrides).length > 0,
  };
}
