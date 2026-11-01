import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { authAPI } from '../../../services/authAPI';
import {
  BACKGROUND_IMAGES,
  EMPTY_REGISTRATION,
  LOGIN_TEXT,
  type RegistrationValues,
} from '../login.constants';

export function useLoginController() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [isRequestAccess, setIsRequestAccess] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [registration, setRegistration] = useState<RegistrationValues>(EMPTY_REGISTRATION);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const copy = LOGIN_TEXT;

  useEffect(() => {
    localStorage.setItem('app-theme', 'royal-white');
    document.body.classList.remove('theme-dark-gold', 'theme-modern-dark');
    document.body.classList.add('theme-royal-white');

    const interval = window.setInterval(() => {
      setBackgroundIndex((current) => (current + 1) % BACKGROUND_IMAGES.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (!username) {
        setErrorMessage(copy.errUsername);
        return;
      }

      const response = await authAPI.login(username.toUpperCase(), password);
      if (!response.success) {
        setErrorMessage(response.message || copy.errInvalid);
        return;
      }

      localStorage.setItem('auth_role', response.role);
      localStorage.setItem('auth_user', response.username);
      if (response.allowedMenus) {
        localStorage.setItem('auth_allowed_menus', JSON.stringify(response.allowedMenus));
      } else {
        localStorage.removeItem('auth_allowed_menus');
      }
      navigate(response.role === 'admin' ? '/' : '/dashboard/customer');
    } catch {
      setErrorMessage(copy.errSys);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAuthorization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAdminLoading(true);

    try {
      const response = await authAPI.verifyAdmin(adminPassword);
      setShowAdminModal(false);
      setAdminPassword('');

      if (response.success) {
        setIsRequestAccess(true);
      } else {
        setErrorMessage(copy.adminInvalid);
      }
    } catch {
      setShowAdminModal(false);
      setAdminPassword('');
      setErrorMessage(copy.errSys);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.register(registration);
      if (response.success) {
        showToast(copy.reqSent, 'success');
        setRegistration(EMPTY_REGISTRATION);
        setIsRequestAccess(false);
      } else {
        showToast(response.message || copy.errSys, 'error');
      }
    } catch {
      showToast(copy.errSys, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRegistration = (field: keyof RegistrationValues, value: string) => {
    setRegistration((current) => ({ ...current, [field]: value }));
  };

  const openAdminModal = () => setShowAdminModal(true);
  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminPassword('');
  };

  return {
    adminPassword,
    backgroundIndex,
    copy,
    errorMessage,
    isAdminLoading,
    isLoading,
    isRequestAccess,
    password,
    registration,
    showAdminModal,
    showForgotModal,
    showPassword,
    username,
    closeAdminModal,
    closeForgotModal: () => setShowForgotModal(false),
    handleAdminAuthorization,
    handleLogin,
    handleRegistration,
    openAdminModal,
    openForgotModal: () => setShowForgotModal(true),
    returnToLogin: () => setIsRequestAccess(false),
    setAdminPassword,
    setPassword,
    setUsername,
    togglePasswordVisibility: () => setShowPassword((current) => !current),
    updateRegistration,
  };
}
