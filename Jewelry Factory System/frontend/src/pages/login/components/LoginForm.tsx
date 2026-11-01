import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { FormEventHandler } from 'react';
import type { LoginCopy } from '../login.constants';
import { FloatingField } from './FloatingField';

interface LoginFormProps {
  copy: LoginCopy;
  errorMessage: string;
  isActive: boolean;
  isLoading: boolean;
  password: string;
  showPassword: boolean;
  username: string;
  onOpenForgotPassword: () => void;
  onOpenRegistration: () => void;
  onPasswordChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onTogglePassword: () => void;
  onUsernameChange: (value: string) => void;
}

export function LoginForm({
  copy,
  errorMessage,
  isActive,
  isLoading,
  password,
  showPassword,
  username,
  onOpenForgotPassword,
  onOpenRegistration,
  onPasswordChange,
  onSubmit,
  onTogglePassword,
  onUsernameChange,
}: LoginFormProps) {
  return (
    <section
      className="login-form-panel login-form-panel--login"
      aria-hidden={!isActive}
      inert={!isActive}
    >
      <h1 className="login-form-title stagger-1">{copy.loginTitle}</h1>
      <p className="login-form-subtitle stagger-2">{copy.loginSub}</p>

      <form onSubmit={onSubmit} className="parchment-form login-form">
        {errorMessage && (
          <div className="login-alert stagger-3" role="alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <FloatingField
          name="username"
          label={copy.username}
          value={username}
          onChange={onUsernameChange}
          autoComplete="username"
          disabled={isLoading}
          staggerClass="stagger-3"
        />

        <FloatingField
          name="password"
          label={copy.password}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={onPasswordChange}
          autoComplete="current-password"
          disabled={isLoading}
          staggerClass="stagger-4"
          endAdornment={(
            <button
              type="button"
              className="login-password-toggle"
              onClick={onTogglePassword}
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              title={showPassword ? copy.hidePassword : copy.showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        />

        <div className="login-secondary-actions stagger-5">
          <button type="button" className="login-text-action login-text-action--underlined" onClick={onOpenRegistration}>
            {copy.reqAccessLink}
          </button>
          <button type="button" className="login-text-action" onClick={onOpenForgotPassword}>
            {copy.forgotPwd}
          </button>
        </div>

        <div className="elegant-divider stagger-5" />

        <button
          type="submit"
          disabled={isLoading}
          className="luxury-btn login-primary-button login-primary-button--signin stagger-6"
        >
          {isLoading ? copy.signingIn : copy.signInBtn}
        </button>
      </form>
    </section>
  );
}
