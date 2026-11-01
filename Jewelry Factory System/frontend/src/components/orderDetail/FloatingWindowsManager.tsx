import { useState, useCallback } from 'react';
import { psPhotoUrl, attachPhotoFallback } from '../../utils/photoUrl';

export interface ActiveWindow {
  id: string;
  idx: number;
  line: Record<string, unknown>;
  photoUrl: string;
  isZoomed: boolean;
  zoomPos: { x: number; y: number };
  x: number;
  y: number;
  zIndex: number;
}

function useFloatingWindows() {
  const [activeWindows, setActiveWindows] = useState<ActiveWindow[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(10005);
  const [draggingWinId, setDraggingWinId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const openWindow = useCallback((line: Record<string, unknown>, idx: number) => {
    const id = String(line.ItemNo);

    const existing = activeWindows.find(w => w.id === id);
    if (existing) {
      const nextZ = maxZIndex + 1;
      setMaxZIndex(nextZ);
      setActiveWindows(prev =>
        prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w)
      );
      return;
    }

    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);

    const offset = (activeWindows.length % 5) * 35;
    const startX = 120 + offset;
    const startY = 140 + offset;

    setActiveWindows(prev => [
      ...prev,
      {
        id,
        idx,
        line,
        photoUrl: psPhotoUrl(id),
        isZoomed: false,
        zoomPos: { x: 50, y: 50 },
        x: startX,
        y: startY,
        zIndex: nextZ
      }
    ]);
  }, [activeWindows, maxZIndex]);

  const closeWindow = useCallback((id: string) => {
    setActiveWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const toggleZoom = useCallback((id: string) => {
    setActiveWindows(prev =>
      prev.map(w => w.id === id ? { ...w, isZoomed: !w.isZoomed } : w)
    );
  }, []);

  const handleWinMouseMove = useCallback((id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const win = activeWindows.find(w => w.id === id);
    if (!win || !win.isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setActiveWindows(prev =>
      prev.map(w => w.id === id ? { ...w, zoomPos: { x, y } } : w)
    );
  }, [activeWindows]);

  const startDrag = useCallback((id: string, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;

    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setActiveWindows(prev =>
      prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w)
    );

    const win = activeWindows.find(w => w.id === id);
    if (!win) return;

    setDraggingWinId(id);
    setDragOffset({
      x: e.clientX - win.x,
      y: e.clientY - win.y
    });
  }, [activeWindows, maxZIndex]);

  const handleGlobalDragMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingWinId) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;

    setActiveWindows(prev =>
      prev.map(w => w.id === draggingWinId ? { ...w, x: newX, y: newY } : w)
    );
  }, [draggingWinId, dragOffset]);

  const stopGlobalDrag = useCallback(() => {
    setDraggingWinId(null);
  }, []);

  return {
    activeWindows,
    draggingWinId,
    openWindow,
    closeWindow,
    toggleZoom,
    handleWinMouseMove,
    startDrag,
    handleGlobalDragMove,
    stopGlobalDrag
  };
}

export function FloatingWindowsRenderer({ manager }: { manager: ReturnType<typeof useFloatingWindows> }) {
  const internalManager = useFloatingWindows();
  manager = manager || internalManager;
  const {
    activeWindows,
    draggingWinId,
    closeWindow,
    toggleZoom,
    handleWinMouseMove,
    startDrag,
    handleGlobalDragMove,
    stopGlobalDrag
  } = manager;

  if (activeWindows.length === 0) return null;

  return (
    <div
      onMouseMove={handleGlobalDragMove}
      onMouseUp={stopGlobalDrag}
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: draggingWinId ? 'auto' : 'none',
        zIndex: 10000,
        fontFamily: 'var(--font-body, "Prompt", sans-serif)',
        userSelect: draggingWinId ? 'none' : 'auto'
      }}
    >
      {activeWindows.map(win => (
        <div
          key={win.id}
          style={{
            position: 'absolute',
            left: `${win.x}px`,
            top: `${win.y}px`,
            width: '450px',
            height: '520px',
            background: 'var(--color-surface-0)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-light)',
            boxShadow: 'var(--shadow-modal)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: win.zIndex,
            animation: 'zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            pointerEvents: 'auto'
          }}
        >
          <div
            onMouseDown={(e) => startDrag(win.id, e)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px', borderBottom: '1px solid var(--color-border-light)',
              background: 'var(--color-surface-1)', cursor: draggingWinId === win.id ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-brand-500)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                {String(win.line.ItemNo)}
              </span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px',
                background: 'color-mix(in srgb, var(--color-success-500), transparent 90%)',
                color: 'var(--color-success-500)', border: '1px solid', borderColor: 'currentColor'
              }}>
                🌐 REAL
              </span>
            </div>
            <button
              onClick={() => closeWindow(win.id)}
              style={{
                border: 'none', background: 'none', color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger-500)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
            <div
              onMouseMove={(e) => handleWinMouseMove(win.id, e)}
              onMouseLeave={() => !win.isZoomed && toggleZoom(win.id)}
              style={{
                width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border-light)',
                overflow: 'hidden', position: 'relative'
              }}
            >
              {win.photoUrl ? (
                <img
                  src={win.photoUrl}
                  alt={String(win.line.ItemNo)}
                  onError={(e) => attachPhotoFallback(e, String(win.line.ItemNo ?? ''))}
                  onClick={() => toggleZoom(win.id)}
                  style={{
                    maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                    transform: win.isZoomed ? 'scale(2.5)' : 'scale(1)',
                    transformOrigin: `${win.zoomPos.x}% ${win.zoomPos.y}%`,
                    transition: win.isZoomed ? 'transform-origin 0.08s ease-out, transform 0.2s ease-out' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform-origin 0.3s',
                    cursor: win.isZoomed ? 'zoom-out' : 'zoom-in', borderRadius: '4px'
                  }}
                />
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>NO PICTURE</span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => toggleZoom(win.id)}
                style={{
                  padding: '6px 16px', borderRadius: '6px', border: '1px solid var(--color-border-light)',
                  background: 'var(--color-surface-1)', color: 'var(--color-brand-600)',
                  fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-1)'}
              >
                🔍 {win.isZoomed ? 'ZOOM OUT' : 'ZOOM IN (2.5x)'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
