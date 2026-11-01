import type { FormEventHandler } from 'react';
import type { LoginCopy } from '../login.constants';
import { FloatingField } from './FloatingField';

interface AdminAuthorizationModalProps {
  copy: LoginCopy;
  isLoading: boolean;
  isOpen: boolean;
  password: string;
  onClose: () => void;
  onPasswordChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function AdminAuthorizationModal({
  copy,
  isLoading,
  isOpen,
  password,
  onClose,
  onPasswordChange,
  onSubmit,
}: AdminAuthorizationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="login-modal-backdrop" role="presentation">
      <section className="login-admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-auth-title">
        {isLoading && (
          <div className="login-modal-loading" aria-label="Loading">
            <div className="dot-loader" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>
        )}

        <h2 id="admin-auth-title" className="login-modal-title">{copy.adminTitle}</h2>
        <p className="login-modal-description">{copy.adminInstruction}</p>

        <form onSubmit={onSubmit} className="parchment-form">
          <FloatingField
            name="adminPassword"
            label={copy.adminPassword}
            type="password"
            value={password}
            onChange={onPasswordChange}
            autoComplete="current-password"
            autoFocus
            required
          />

          <div className="login-modal-actions">
            <button type="button" className="login-modal-button login-modal-button--secondary" onClick={onClose}>
              {copy.cancel}
            </button>
            <button type="submit" className="luxury-btn login-modal-button login-modal-button--primary">
              {copy.proceed}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
