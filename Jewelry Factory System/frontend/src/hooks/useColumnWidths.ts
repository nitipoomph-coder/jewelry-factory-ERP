// User-resizable table columns, remembered per signed-in user and per table in this browser.
//
// - Drag the handle on a header's right edge (mouse, pen or touch), double-click it to reset that
//   column, or focus it and use ArrowLeft / ArrowRight (Shift = bigger steps), Delete to reset.
// - While dragging, only the <col> element and the table width are changed directly, so the
//   table body is not re-rendered on every pointer move; the width is saved once on release.
// - Saved in localStorage as overrides only ({ columnKey: width }), keyed by the username in the
//   login token (auth_user can be renamed from the profile menu, the token username cannot).
// - Tables that show/hide columns pass `keys` (visible columns, in order); widths of hidden columns
//   stay saved. Columns pinned on the left pass `stickyKeys` and put `stickyClass(key)` on their
//   header and body cells: the `left` offsets live in one small <style> rule per pinned column, so a
//   drag updates a few CSS rules instead of every cell. (A CSS variable on the <table> was measured
//   to force a style recalculation of the whole table on every frame — see debug-history 2026-11-24.)
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

export interface ColumnWidthOptions {
  minWidth?: number;
  maxWidth?: number;
  /** Visible columns in display order (default: every key of `defaults`). */
  keys?: string[];
  /** Columns pinned on the left (position: sticky); offsets = widths of the pinned columns before them. */
  stickyKeys?: string[];
}

export type ColumnWidths = ReturnType<typeof useColumnWidths>;

const cssSafe = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

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

  // Compare by content so callers do not have to memoize the arrays.
  const keysSig = options.keys?.join('\u0001');
  const stickySig = options.stickyKeys?.join('\u0001') ?? '';
  const order = useMemo(() => (keysSig !== undefined ? keysSig.split('\u0001').filter(Boolean) : Object.keys(defaults)), [keysSig, defaults]);
  const stickySet = useMemo(() => new Set(stickySig ? stickySig.split('\u0001') : []), [stickySig]);

  const getWidth = useCallback((key: string) => overrides[key] ?? defaults[key] ?? 100, [overrides, defaults]);
  const totalWidth = useMemo(() => order.reduce((sum, key) => sum + getWidth(key), 0), [order, getWidth]);

  const stickyOffsets = useCallback((widthOf: (key: string) => number) => {
    const offsets: [string, number][] = [];
    let left = 0;
    for (const key of order) {
      if (!stickySet.has(key)) continue;
      offsets.push([key, left]);
      left += widthOf(key);
    }
    return offsets;
  }, [order, stickySet]);

  const tableStyle = useMemo<CSSProperties>(() => ({ width: totalWidth }), [totalWidth]);

  // Pinned-column offsets: one rule per pinned column in a <style> element owned by this hook.
  const scopeId = cssSafe(useId());
  const stickyClass = useCallback((key: string) => `cw${scopeId}-${cssSafe(key)}`, [scopeId]);
  const styleEl = useRef<HTMLStyleElement | null>(null);
  const stickyRules = useRef(new Map<string, CSSStyleRule>());

  const setStickyLeft = useCallback((offsets: [string, number][]) => {
    for (const [key, left] of offsets) stickyRules.current.get(key)?.style.setProperty('left', `${left}px`);
  }, []);

  useLayoutEffect(() => {
    const offsets = stickyOffsets(getWidth);
    if (offsets.length === 0 && !styleEl.current) return;
    if (!styleEl.current) {
      styleEl.current = document.createElement('style');
      styleEl.current.dataset.columnWidths = scopeId;
      document.head.appendChild(styleEl.current);
    }
    styleEl.current.textContent = offsets.map(([key, left]) => `.${stickyClass(key)}{left:${left}px}`).join('\n');
    stickyRules.current.clear();
    const rules = styleEl.current.sheet?.cssRules;
    if (rules) {
      offsets.forEach(([key], index) => {
        const rule = rules[index];
        if (rule instanceof CSSStyleRule) stickyRules.current.set(key, rule);
      });
    }
  }, [stickyOffsets, getWidth, stickyClass, scopeId]);

  useLayoutEffect(() => () => {
    styleEl.current?.remove();
    styleEl.current = null;
    stickyRules.current.clear();
  }, []);

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

    const resizesSticky = stickySet.has(key);
    const apply = () => {
      frame = 0;
      const col = colEls.current.get(key);
      if (col) col.style.width = `${width}px`;
      const table = tableRef.current;
      if (!table) return;
      table.style.width = `${baseTotal + width}px`;
      if (resizesSticky) setStickyLeft(stickyOffsets(k => (k === key ? width : getWidth(k))));
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
  }, [clamp, commit, getWidth, totalWidth, stickySet, stickyOffsets, setStickyLeft]);

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
    /** Table width; spread into the <table> style. */
    tableStyle,
    /** Class for the header and body cells of a pinned column (sets its `left`). */
    stickyClass,
    tableRef,
    colRef,
    handleProps,
    resetAll,
    isCustomized: Object.keys(overrides).length > 0,
  };
}
