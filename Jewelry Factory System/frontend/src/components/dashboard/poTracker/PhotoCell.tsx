import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PhotoCellProps {
  itemNo?: string | null;
  title: string;
}

// Hover preview: a larger copy beside the thumbnail after a short pause, so moving the mouse down the
// table does not load every big photo. Hidden on leave and on any scroll (its position would be stale).
const PREVIEW_SIZE = 260;
const PREVIEW_DELAY_MS = 200;

export function PhotoCell({ itemNo, title }: PhotoCellProps) {
  const [showModal, setShowModal] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [preview, setPreview] = useState<{ left: number; top: number } | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);

  const openPreview = (target: HTMLElement) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      const r = target.getBoundingClientRect();
      const gap = 10;
      // Right of the thumbnail, or left when there is no room; kept inside the window vertically
      const left = r.right + gap + PREVIEW_SIZE <= window.innerWidth ? r.right + gap : Math.max(8, r.left - gap - PREVIEW_SIZE);
      const top = Math.min(Math.max(8, r.top + r.height / 2 - PREVIEW_SIZE / 2), window.innerHeight - PREVIEW_SIZE - 8);
      setPreview({ left, top });
    }, PREVIEW_DELAY_MS);
  };
  const closePreview = () => {
    window.clearTimeout(hoverTimer.current);
    setPreview(null);
  };

  useEffect(() => {
    if (!preview) return;
    const onScroll = () => setPreview(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [preview]);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const cleanItem = itemNo?.trim();

  if (!cleanItem || hasError) {
    return (
      <span style={{ color: 'var(--color-text-quaternary)', fontSize: '0.75rem', userSelect: 'none' }}>
        -
      </span>
    );
  }

  return (
    <>
      <img
        src={`/api/photos/ps/${encodeURIComponent(cleanItem)}`}
        alt={cleanItem}
        loading="lazy"
        onClick={(e) => {
          e.stopPropagation();
          closePreview();
          setShowModal(true);
        }}
        title={`Click to view photo: ${cleanItem} (${title})`}
        style={{
          width: '40px',
          height: '40px',
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto',
          cursor: 'zoom-in',
          background: 'transparent',
          border: 'none',
          outline: 'none',
        }}
        onMouseEnter={(e) => openPreview(e.currentTarget)}
        onMouseLeave={closePreview}
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.dataset.triedCad) {
            img.dataset.triedCad = 'true';
            img.src = `/api/photos/cad/${encodeURIComponent(cleanItem)}`;
          } else {
            setHasError(true);
          }
        }}
      />

      {preview && !showModal &&
        createPortal(
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: preview.left,
              top: preview.top,
              zIndex: 9000,
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              padding: 8,
              borderRadius: 8,
              background: 'var(--color-ui-surface)',
              boxShadow: 'var(--shadow-dropdown)',
              pointerEvents: 'none',
            }}
          >
            <img
              src={`/api/photos/ps/${encodeURIComponent(cleanItem)}`}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.triedCad) {
                  img.dataset.triedCad = 'true';
                  img.src = `/api/photos/cad/${encodeURIComponent(cleanItem)}`;
                }
              }}
            />
          </div>,
          document.body
        )}

      {showModal &&
        createPortal(
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'color-mix(in srgb, var(--color-surface-900) 85%, transparent)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: 24,
                right: 24,
                background: 'color-mix(in srgb, var(--color-text-inverse) 20%, transparent)',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-text-inverse)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text-inverse) 35%, transparent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text-inverse) 20%, transparent)';
              }}
            >
              <X size={20} />
            </button>

            <img
              src={`/api/photos/ps/${encodeURIComponent(cleanItem)}`}
              alt={cleanItem}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '85vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                cursor: 'default',
                filter: 'drop-shadow(0 12px 28px color-mix(in srgb, var(--color-surface-900) 60%, transparent))',
              }}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.triedCad) {
                  img.dataset.triedCad = 'true';
                  img.src = `/api/photos/cad/${encodeURIComponent(cleanItem)}`;
                }
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
