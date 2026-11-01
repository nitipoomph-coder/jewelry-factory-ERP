export interface LoginCopy {
  loginTitle: string;
  loginSub: string;
  username: string;
  password: string;
  reqAccessLink: string;
  forgotPwd: string;
  signInBtn: string;
  signingIn: string;
  reqAccessTitle: string;
  reqAccessSub: string;
  fullName: string;
  department: string;
  submitReqBtn: string;
  backToLogin: string;
  errUsername: string;
  errInvalid: string;
  errSys: string;
  reqSent: string;
  adminTitle: string;
  adminInstruction: string;
  adminPassword: string;
  adminInvalid: string;
  cancel: string;
  proceed: string;
  showPassword: string;
  hidePassword: string;
  supportTitle: string;
  supportDescription: string;
  supportOnly: string;
}

export interface RegistrationValues {
  fullName: string;
  username: string;
  password: string;
  department: string;
}

export const BACKGROUND_IMAGES = [
  '/assets/cll_blue_geode.png',
  '/assets/cll_plate.png',
  '/assets/cll_holding_charms.png',
  '/assets/cll_rock.png',
  '/assets/cll_hand_ring.png',
  '/assets/cll_ring_earring.png',
  '/assets/cll_box.png',
  '/assets/cll_ring.png',
  '/assets/cll_people.png',
  '/assets/cll_pearl.png',
] as const;

export const EMPTY_REGISTRATION: RegistrationValues = {
  fullName: '',
  username: '',
  password: '',
  department: '',
};

export const LOGIN_TEXT: LoginCopy = {
  loginTitle: 'JEWELRY',
  loginSub: 'Sign in to your account',
  username: 'Username',
  password: 'Password',
  reqAccessLink: 'Register Account',
  forgotPwd: 'Forgot Password?',
  signInBtn: 'SIGN IN',
  signingIn: 'SIGNING IN...',
  reqAccessTitle: 'Register New Account',
  reqAccessSub: 'Admin authorization required to create a new user.',
  fullName: 'Full Name',
  department: 'Department',
  submitReqBtn: 'CREATE ACCOUNT',
  backToLogin: 'Back to Login',
  errUsername: 'Please enter Username',
  errInvalid: 'Invalid username or password',
  errSys: 'System error. Please try again.',
  reqSent: 'Registration successful.',
  adminTitle: 'Admin Authorization',
  adminInstruction: 'Please enter the admin password to access registration.',
  adminPassword: 'Admin Password',
  adminInvalid: 'Invalid Admin Password. Access Denied.',
  cancel: 'Cancel',
  proceed: 'Proceed',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  supportTitle: 'Contact IT Support',
  supportDescription: 'For security purposes, all password reset requests must be handled by the team.',
  supportOnly: 'IT Support Only',
};
