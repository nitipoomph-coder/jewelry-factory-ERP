import { Headset } from 'lucide-react';
import type { LoginCopy } from '../login.constants';

interface ForgotPasswordModalProps {
  copy: LoginCopy;
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ copy, isOpen, onClose }: ForgotPasswordModalProps) {
  if (!isOpen) return null;

  return (
    <div className="login-modal-backdrop login-modal-backdrop--support" role="presentation">
      <section className="login-support-modal" role="dialog" aria-modal="true" aria-labelledby="support-title">
        <div className="login-support-icon" aria-hidden="true">
          <Headset size={32} />
        </div>

        <h2 id="support-title" className="login-support-title">{copy.supportTitle}</h2>
        <p className="login-support-description">
          {copy.supportDescription}
          <br /><br />
          <strong>{copy.supportOnly}</strong>
        </p>

        <button type="button" className="login-support-close" onClick={onClose}>
          {copy.backToLogin}
        </button>
      </section>
    </div>
  );
}
