// src/components/orderDetail/PhotoGalleryModal.tsx
import { useState } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { psPhotoUrl, attachPhotoFallback } from '../../utils/photoUrl';

// ─── Photo Gallery Modal ─────────────────────────────────────────────────────
// รูปดึงfrom network path อย่างเดียว (ps ก่อน, onError fallback ไป cad)
function GalleryItemCard({ line, onClick }: { line: Record<string, unknown>, onClick: () => void }) {
  const itemNo = line.ItemNo as string | undefined;
  const photoUrl = psPhotoUrl(itemNo);

  return (
    <div
      onClick={() => photoUrl && onClick()}
      style={{
        cursor: photoUrl ? 'pointer' : 'default',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'var(--color-surface-0)',
        border: '1px solid var(--color-border-light)',
        transition: 'border-color 0.2s ease',
        boxShadow: 'var(--shadow-panel)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        if (photoUrl) {
          e.currentTarget.style.borderColor = 'var(--color-brand-500)';
        }
      }}
      onMouseLeave={e => {
        if (photoUrl) {
          e.currentTarget.style.borderColor = 'var(--color-border-light)';
        }
      }}
    >
      {/* 🏷️ Status Badge on Thumbnail */}
      {photoUrl && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '4px 8px', borderRadius: '20px',
          fontSize: '0.62rem', fontWeight: 800,
          background: 'var(--color-success-500)',
          color: 'var(--color-overlay-text)',
          border: '1px solid var(--color-overlay-border)',
          boxShadow: 'var(--shadow-panel)'
        }}>
          <span style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: 'var(--color-overlay-text)',
            display: 'inline-block'
          }} />
          🌐 REAL
        </div>
      )}

      <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
        <span style={{ position: 'absolute', fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>NO PHOTO</span>
        {itemNo && (
          <img key={itemNo} src={photoUrl} alt={String(line.ItemNo)} loading="lazy" onError={(e) => attachPhotoFallback(e, itemNo)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '12px', boxSizing: 'border-box', borderRadius: '6px' }} />
        )}
      </div>

      <div style={{ padding: '12px', background: 'var(--color-surface-0)', borderTop: '1px solid var(--color-border-light)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 850, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display, monospace)' }}>
          {String(line.ItemNo)}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {String(line.ItemDesc || 'No Description')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>QTY: {line.Qty != null ? Number(line.Qty).toLocaleString() : '—'}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)', fontWeight: 700, fontFamily: 'monospace' }}>#{String(line.LineNo ?? '')}</span>
        </div>
      </div>
    </div>
  );
}

interface ActiveWindow {
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

export function PhotoGalleryModal({ lines, onClose }: { lines: Record<string, unknown>[], onClose: () => void }) {
  const photosLines = lines.filter(l => l.ItemNo);
  const [activeWindows, setActiveWindows] = useState<ActiveWindow[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(10005);
  const [draggingWinId, setDraggingWinId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  if (photosLines.length === 0) {
    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'var(--color-overlay-scrim)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--color-surface-0)', borderRadius: '8px', padding: '48px', textAlign: 'center',
          boxShadow: 'var(--shadow-modal)', maxWidth: '400px', border: '1px solid var(--color-border-light)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📷</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>NO PHOTOS FOUND</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '24px', fontFamily: 'var(--font-body)' }}>No item photo or code in this document</div>
          <button onClick={onClose} style={{
            padding: '10px 28px', borderRadius: '8px', background: 'var(--color-brand-500)', color: 'var(--color-ui-on-interactive)',
            border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer'
          }}>Close Gallery</button>
        </div>
      </div>
    );
  }

  const openWindow = (idx: number) => {
    const line = photosLines[idx];
    const id = String(line.ItemNo);

    // If already open, just bring to front
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

    // Offset starting position cascaded
    const offset = (activeWindows.length % 5) * 35;
    const startX = 120 + offset;
    const startY = 140 + offset;

    // เCloseหน้าต่างทันทีด้วย URL รูปfrom network path (ps) — <img> Arrangeการ fallback ไป cad เอง
    setActiveWindows(prev => [
      ...prev,
      {
        id,
        idx,
        line,
        photoUrl: psPhotoUrl(line.ItemNo as string),
        isZoomed: false,
        zoomPos: { x: 50, y: 50 },
        x: startX,
        y: startY,
        zIndex: nextZ
      }
    ]);
  };

  const closeWindow = (id: string) => {
    setActiveWindows(prev => prev.filter(w => w.id !== id));
  };

  const toggleZoom = (id: string) => {
    setActiveWindows(prev =>
      prev.map(w => w.id === id ? { ...w, isZoomed: !w.isZoomed } : w)
    );
  };

  const handleWinMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const win = activeWindows.find(w => w.id === id);
    if (!win || !win.isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setActiveWindows(prev =>
      prev.map(w => w.id === id ? { ...w, zoomPos: { x, y } } : w)
    );
  };

  const startDrag = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
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
  };

  const handleGlobalDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingWinId) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setActiveWindows(prev =>
      prev.map(w => w.id === draggingWinId ? { ...w, x: newX, y: newY } : w)
    );
  };

  const stopGlobalDrag = () => {
    setDraggingWinId(null);
  };

  return (
    <div
      onMouseMove={handleGlobalDragMove}
      onMouseUp={stopGlobalDrag}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--color-overlay-scrim)',

        zIndex: 10000,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-body, "Prompt", sans-serif)',
        animation: 'fadeIn 0.25s ease-out forwards',
        overflow: 'hidden',
        userSelect: draggingWinId ? 'none' : 'auto'
      }}
    >
      {/* Premium Gallery Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 28px',
        borderBottom: '1px solid var(--color-border-light)',
        background: 'var(--color-surface-0)',
        boxShadow: 'var(--shadow-panel)',
        zIndex: 10002
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'color-mix(in srgb, var(--color-brand-500), transparent 90%)', padding: '8px', borderRadius: '10px', color: 'var(--color-brand-500)' }}>
            <ClipboardList size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '1.15rem', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
              MASTER PHOTO STUDIO
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
              Independent multi-window photo inspection with free dragging
            </span>
          </div>
          <span style={{
            background: 'color-mix(in srgb, var(--color-brand-500), transparent 92%)',
            color: 'var(--color-brand-600)',
            padding: '4px 14px',
            border: '1px solid color-mix(in srgb, var(--color-brand-500), transparent 80%)',
            borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800,
            fontFamily: 'monospace'
          }}>{photosLines.length} ITEMS</span>
        </div>

        <button onClick={onClose} style={{
          width: 42, height: 42, borderRadius: '12px',
          border: '1px solid var(--color-border-light)',
          background: 'var(--color-surface-1)',
          color: 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger-500), transparent 92%)'; e.currentTarget.style.borderColor = 'var(--color-danger-300)'; e.currentTarget.style.color = 'var(--color-danger-500)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-1)'; e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Gallery Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px', background: 'var(--color-surface-1)', position: 'relative' }}>

        {/* Gallery Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px', maxWidth: '1400px', margin: '0 auto', zIndex: 10001, position: 'relative'
        }}>
          {photosLines.map((line, idx) => (
            <GalleryItemCard
              key={idx}
              line={line}
              onClick={() => openWindow(idx)}
            />
          ))}
        </div>

        {/* Stackable Draggable Floating Windows Manager */}
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
            }}
          >
            {/* Window Header - Draggable Area */}
            <div
              onMouseDown={(e) => startDrag(win.id, e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid var(--color-border-light)',
                background: 'var(--color-surface-1)',
                cursor: draggingWinId === win.id ? 'grabbing' : 'grab',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-brand-500)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                  {String(win.line.ItemNo)}
                </span>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: 'color-mix(in srgb, var(--color-success-500), transparent 90%)',
                  color: 'var(--color-success-500)',
                  border: '1px solid',
                  borderColor: 'currentColor'
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

            {/* Window Body (Zoomable Viewport & Specs) */}
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>

              {/* Symmetrical Magnifier Frame */}
              <div
                onMouseMove={(e) => handleWinMouseMove(win.id, e)}
                onMouseLeave={() => !win.isZoomed && setActiveWindows(prev => prev.map(w => w.id === win.id ? { ...w, zoomPos: { x: 50, y: 50 } } : w))}
                style={{
                  width: '100%',
                  height: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-surface-2)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border-light)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {win.photoUrl ? (
                  <img
                    src={win.photoUrl}
                    alt={String(win.line.ItemNo)}
                    onError={(e) => attachPhotoFallback(e, win.line.ItemNo as string)}
                    onClick={() => toggleZoom(win.id)}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transform: win.isZoomed ? 'scale(2.5)' : 'scale(1)',
                      transformOrigin: `${win.zoomPos.x}% ${win.zoomPos.y}%`,
                      transition: win.isZoomed
                        ? 'transform-origin 0.08s ease-out, transform 0.2s ease-out'
                        : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform-origin 0.3s',
                      cursor: win.isZoomed ? 'zoom-out' : 'zoom-in',
                      borderRadius: '4px'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>NO PICTURE</span>
                )}
              </div>

              {/* Action Zoom Info Tray */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => toggleZoom(win.id)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-1)',
                    color: 'var(--color-brand-600)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-1)'}
                >
                  🔍 {win.isZoomed ? 'ZOOM OUT' : 'ZOOM IN (Zoom 2.5x)'}
                </button>
              </div>

              {/* Symmetrical production spec details - 100% UNIFORM */}
              <div style={{
                width: '100%',
                fontSize: '0.72rem',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface-1)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-light)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>ITEM NO / Product Code</span>
                  <span style={{ fontWeight: 800, color: 'var(--color-brand-600)', fontFamily: 'monospace' }}>{String(win.line.ItemNo)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>SIZE / Item Size</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{String(win.line.ItemSize || '—')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>METAL / Setting</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{String(win.line.ItemMat || '—')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>STONE / Stone Info</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{String(win.line.Stone || '—')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'capitalize' }}>DESCRIPTION / Details</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{String(win.line.ItemDesc || '—')}</span>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
