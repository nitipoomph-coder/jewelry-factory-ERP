import { ArrowLeft } from 'lucide-react';
import type { FormEventHandler } from 'react';
import type { LoginCopy, RegistrationValues } from '../login.constants';
import { FloatingField } from './FloatingField';

interface RegistrationFormProps {
  copy: LoginCopy;
  isActive: boolean;
  values: RegistrationValues;
  onBack: () => void;
  onChange: (field: keyof RegistrationValues, value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function RegistrationForm({
  copy,
  isActive,
  values,
  onBack,
  onChange,
  onSubmit,
}: RegistrationFormProps) {
  return (
    <section
      className="login-form-panel login-form-panel--request"
      aria-hidden={!isActive}
      inert={!isActive}
    >
      <button type="button" className="login-back-button stagger-1" onClick={onBack}>
        <ArrowLeft size={16} />
        {copy.backToLogin}
      </button>

      <h1 className="login-form-title login-form-title--registration stagger-2">{copy.reqAccessTitle}</h1>
      <p className="login-form-subtitle login-form-subtitle--registration stagger-3">{copy.reqAccessSub}</p>

      <form onSubmit={onSubmit} className="parchment-form login-form">
        <FloatingField
          name="fullName"
          label={copy.fullName}
          value={values.fullName}
          onChange={(value) => onChange('fullName', value)}
          autoComplete="name"
          required
          staggerClass="stagger-4"
        />
        <FloatingField
          name="registrationUsername"
          label={copy.username}
          value={values.username}
          onChange={(value) => onChange('username', value)}
          autoComplete="username"
          required
          staggerClass="stagger-5"
        />
        <FloatingField
          name="registrationPassword"
          label={copy.password}
          type="password"
          value={values.password}
          onChange={(value) => onChange('password', value)}
          autoComplete="new-password"
          required
          staggerClass="stagger-5"
        />
        <FloatingField
          name="department"
          label={copy.department}
          value={values.department}
          onChange={(value) => onChange('department', value)}
          autoComplete="organization-title"
          required
          staggerClass="stagger-6"
        />

        <div className="elegant-divider stagger-7" />

        <button
          type="submit"
          className="luxury-btn login-primary-button login-primary-button--register stagger-7"
        >
          {copy.submitReqBtn}
        </button>
      </form>
    </section>
  );
}
