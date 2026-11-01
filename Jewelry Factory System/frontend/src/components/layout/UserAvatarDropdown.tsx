import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  UserPen,
  Phone,
  LogOut,
  X,
  ChevronDown,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function UserAvatarDropdown() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User state from localStorage
  const [userName, setUserName] = useState(() => localStorage.getItem('auth_user') || 'User');
  const role = (localStorage.getItem('auth_role') || 'sales').toUpperCase();
  const [deskPhone, setDeskPhone] = useState<string>(() => {
    const savedDesk = localStorage.getItem('auth_desk_phone');
    if (savedDesk) return savedDesk;
    const savedLegacy = localStorage.getItem('auth_phone');
    if (savedLegacy) return savedLegacy;
    try {
      const savedPhones = localStorage.getItem('auth_phones');
      if (savedPhones) {
        const parsed = JSON.parse(savedPhones);
        if (Array.isArray(parsed) && parsed[0]) return parsed[0];
      }
    } catch {
      // ignore
    }
    return '02-123-4567';
  });

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form states - Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Form states - Profile & Desk Phone
  const [editName, setEditName] = useState(userName);
  const [editDeskPhone, setEditDeskPhone] = useState(deskPhone);
  const [profileError, setProfileError] = useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Standard Logout flow
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_user');
    setIsOpen(false);
    navigate('/login');
  };

  // Open Edit Profile Modal
  const openEditProfile = () => {
    setEditName(userName);
    setEditDeskPhone(deskPhone);
    setProfileError('');
    setIsOpen(false);
    setShowProfileModal(true);
  };

  // Open Change Password Modal
  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setIsOpen(false);
    setShowPasswordModal(true);
  };

  // Validate desk phone format: at least 6 digits (e.g. 02-123-4567 or 021234567)
  const isValidDeskPhone = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 6;
  };

  // Submit Profile update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setProfileError('Please enter username');
      return;
    }

    if (!editDeskPhone.trim()) {
      setProfileError('Please enter desk phone');
      return;
    }

    if (!isValidDeskPhone(editDeskPhone)) {
      setProfileError('Invalid desk phone format (e.g. 02-123-4567)');
      return;
    }

    setIsSubmittingProfile(true);
    setProfileError('');

    try {
      // TODO: Connect to backend endpoint PUT /api/user/profile
      // Example payload:
      // await fetchWithAuth('/api/user/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ fullName: editName, deskPhone: editDeskPhone.trim() })
      // });
      await new Promise(resolve => setTimeout(resolve, 400)); // Mock network delay

      // Update local storage and state
      localStorage.setItem('auth_user', editName.trim());
      localStorage.setItem('auth_desk_phone', editDeskPhone.trim());
      setUserName(editName.trim());
      setDeskPhone(editDeskPhone.trim());

      showToast('User profile saved successfully', 'success');
      setShowProfileModal(false);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Error saving data');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Submit Password update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('Please enter current password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordError('');

    try {
      // TODO: Connect to backend endpoint PUT /api/user/change-password
      // Example payload:
      // await fetchWithAuth('/api/user/change-password', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ currentPassword, newPassword })
      // });
      await new Promise(resolve => setTimeout(resolve, 500)); // Mock network delay

      showToast('Password changed successfully', 'success');
      setShowPasswordModal(false);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Cannot change password. Check current password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const initialLetter = (userName || 'U')[0].toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg py-1 px-1.5 sm:px-2 border-none bg-transparent hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer outline-none group"
        title={`Profile: ${userName} (${role})`}
        aria-label="User profile menu"
      >
        <div
          className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-black shadow-xs shrink-0 select-none"
          style={{
            background: 'var(--color-brand-500)',
            color: 'var(--color-ui-on-interactive)',
          }}
        >
          {initialLetter}
        </div>
        <div className="hidden md:flex flex-col text-left max-w-[120px]">
          <span className="text-[12px] font-bold text-[var(--color-text-primary)] truncate leading-tight">
            {userName}
          </span>
          <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider leading-none">
            {role}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`hidden sm:block text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-24px)] rounded-xl border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{ boxShadow: 'var(--shadow-dropdown)' }}
        >
          {/* Header Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-surface-1)] mb-1">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black shadow-xs shrink-0 select-none"
              style={{
                background: 'var(--color-brand-500)',
                color: 'var(--color-ui-on-interactive)',
              }}
            >
              {initialLetter}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">
                {userName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
                  <ShieldCheck size={11} /> {role}
                </span>
              </div>
              {deskPhone && (
                <div className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1.5 mt-1 truncate">
                  <Phone size={11} className="shrink-0" />
                  <span className="truncate">Desk: {deskPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Menu List */}
          <div className="flex flex-col gap-0.5 py-1">
            <button
              type="button"
              onClick={openEditProfile}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors border-none bg-transparent cursor-pointer text-left"
            >
              <UserPen size={15} className="text-[var(--color-text-secondary)]" />
              <span>Edit name and desk phone</span>
            </button>

            <button
              type="button"
              onClick={openChangePassword}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors border-none bg-transparent cursor-pointer text-left"
            >
              <KeyRound size={15} className="text-[var(--color-text-secondary)]" />
              <span>Change Password</span>
            </button>
          </div>

          <div className="my-1 border-t border-[var(--color-border-light)]" />

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-[var(--color-danger-500)] hover:bg-[var(--color-danger-50)] transition-colors border-none bg-transparent cursor-pointer text-left"
          >
            <LogOut size={15} />
            <span>Logout (Logout)</span>
          </button>
        </div>
      )}

      {/* Modal 1: Edit Profile & Desk Phone */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--color-surface-900)_70%,transparent)] backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-light)]">
              <div className="flex items-center gap-2">
                <UserPen size={18} className="text-[var(--color-brand-600)]" />
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] m-0">
                  Edit Profile
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="rounded-lg p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 flex flex-col gap-4">
              {profileError && (
                <div className="p-3 text-xs font-semibold rounded-lg bg-[var(--color-danger-50)] text-[var(--color-danger-500)] border border-[var(--color-danger-100)]">
                  {profileError}
                </div>
              )}

              {/* User Name Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Username (Name / Username)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-1 focus:ring-[var(--color-brand-500)]"
                  placeholder="Enter your name"
                  required
                />
              </div>

              {/* Desk Phone Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Desk Phone (Desk Phone)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
                    <Phone size={14} />
                  </span>
                  <input
                    type="text"
                    value={editDeskPhone}
                    onChange={(e) => setEditDeskPhone(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-1)] pl-8 pr-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-1 focus:ring-[var(--color-brand-500)]"
                    placeholder="e.g. 02-123-4567"
                    required
                  />
                </div>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">
                  * Enter desk phone e.g. 02-123-4567
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-light)] mt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProfile}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-xs font-bold text-[var(--color-ui-on-interactive)] hover:bg-[var(--color-brand-600)] transition-colors cursor-pointer disabled:opacity-50 border-none"
                >
                  <Check size={14} /> {isSubmittingProfile ? 'Saving...' : 'Save Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Change Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--color-surface-900)_70%,transparent)] backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-ui-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-light)]">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-[var(--color-brand-600)]" />
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] m-0">
                  Change Password
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-5 flex flex-col gap-4">
              {passwordError && (
                <div className="p-3 text-xs font-semibold rounded-lg bg-[var(--color-danger-50)] text-[var(--color-danger-500)] border border-[var(--color-danger-100)]">
                  {passwordError}
                </div>
              )}

              {/* Current Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Current Password (Current Password)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-1 focus:ring-[var(--color-brand-500)]"
                  placeholder="Enter current password"
                  required
                />
              </div>

              {/* New Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">
                  New Password (New Password)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-1 focus:ring-[var(--color-brand-500)]"
                  placeholder="at least 6 chars"
                  required
                />
              </div>

              {/* Confirm New Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Confirm New Password (Confirm Password)
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-500)] focus:ring-1 focus:ring-[var(--color-brand-500)]"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-light)] mt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-1)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-xs font-bold text-[var(--color-ui-on-interactive)] hover:bg-[var(--color-brand-600)] transition-colors cursor-pointer disabled:opacity-50 border-none"
                >
                  <Check size={14} /> {isSubmittingPassword ? 'Changing...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
