import { AdminAuthorizationModal } from './components/AdminAuthorizationModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { LoginCover } from './components/LoginCover';
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { useLoginController } from './hooks/useLoginController';
import './LoginPage.css';

export default function LoginPage() {
  const controller = useLoginController();
  const stageStateClass = controller.isRequestAccess
    ? 'login-form-stage--request'
    : 'login-form-stage--login';

  return (
    <main className="login-page login-split-layout">
      <LoginCover
        activeImageIndex={controller.backgroundIndex}
        isRequestAccess={controller.isRequestAccess}
      />

      <div className={`login-forms-container parchment-texture-bg${controller.isRequestAccess ? ' is-request-access' : ''}`}>
        <div className={`login-form-stage ${stageStateClass}`}>
          <LoginForm
            copy={controller.copy}
            errorMessage={controller.errorMessage}
            isActive={!controller.isRequestAccess}
            isLoading={controller.isLoading}
            password={controller.password}
            showPassword={controller.showPassword}
            username={controller.username}
            onOpenForgotPassword={controller.openForgotModal}
            onOpenRegistration={controller.openAdminModal}
            onPasswordChange={controller.setPassword}
            onSubmit={controller.handleLogin}
            onTogglePassword={controller.togglePasswordVisibility}
            onUsernameChange={controller.setUsername}
          />

          <RegistrationForm
            copy={controller.copy}
            isActive={controller.isRequestAccess}
            values={controller.registration}
            onBack={controller.returnToLogin}
            onChange={controller.updateRegistration}
            onSubmit={controller.handleRegistration}
          />
        </div>
      </div>

      <AdminAuthorizationModal
        copy={controller.copy}
        isLoading={controller.isAdminLoading}
        isOpen={controller.showAdminModal}
        password={controller.adminPassword}
        onClose={controller.closeAdminModal}
        onPasswordChange={controller.setAdminPassword}
        onSubmit={controller.handleAdminAuthorization}
      />

      <ForgotPasswordModal
        copy={controller.copy}
        isOpen={controller.showForgotModal}
        onClose={controller.closeForgotModal}
      />
    </main>
  );
}
