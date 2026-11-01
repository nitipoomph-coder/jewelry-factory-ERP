import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none' // Allow clicks to pass through empty space
        }}
      >
        {toasts.map(toast => {
          let icon;
          const color = 'var(--color-text-primary)';
          const bgColor = 'var(--color-ui-surface)';
          let borderColor = 'var(--color-border-light)';
          
          if (toast.type === 'success') {
            icon = <CheckCircle size={18} color="var(--color-success-500)" />;
            borderColor = 'color-mix(in srgb, var(--color-success-500) 30%, var(--color-border-light))';
          } else if (toast.type === 'error') {
            icon = <AlertOctagon size={18} color="var(--color-danger-500)" />;
            borderColor = 'color-mix(in srgb, var(--color-danger-500) 30%, var(--color-border-light))';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle size={18} color="var(--color-warning-500)" />;
            borderColor = 'color-mix(in srgb, var(--color-warning-500) 30%, var(--color-border-light))';
          } else {
            icon = <Info size={18} color="var(--color-brand-500)" />;
            borderColor = 'color-mix(in srgb, var(--color-brand-500) 30%, var(--color-border-light))';
          }

          return (
            <div 
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: bgColor,
                color: color,
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-dropdown)',
                border: `1px solid ${borderColor}`,
                minWidth: '280px',
                maxWidth: '400px',
                animation: 'toast-slide-in 0.3s ease-out forwards',
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex' }}>
                {icon}
              </div>
              <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4 }}>
                {toast.message}
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--color-text-tertiary)', 
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
                className="hover:bg-[var(--color-surface-1)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
