import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PhotoCellProps {
  itemNo?: string | null;
  title: string;
}

export function PhotoCell({ itemNo, title }: PhotoCellProps) {
  const [showModal, setShowModal] = useState(false);
  const [hasError, setHasError] = useState(false);

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
          setShowModal(true);
        }}
        title={`Click to view photo: ${cleanItem} (${title})`}
        style={{
          width: '40px',
          height: '40px',
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
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
