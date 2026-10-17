import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { loginUser, getMeWithToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './LoginPage.css';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/home';

  // 🔹 OAuth (Google & GitHub) Token & Error Receiver Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthError = params.get('error');
    const oauthMessage = params.get('message');
    const returnTo = params.get('returnTo');

    if (oauthError) {
      const errorMessages = {
        github_cancelled: 'GitHub sign-in was cancelled.',
        github_failed: 'GitHub login failed.',
        github_not_configured: 'GitHub OAuth is not configured on the server.',
        google_cancelled: 'Google sign-in was cancelled.',
        google_failed: 'Google login failed.',
        google_not_configured: 'Google OAuth is not configured on the server.',
        no_verified_email: 'Your GitHub account has no verified email address.',
        account_inactive: 'Your account is deactivated. Please contact support.',
        invalid_state: 'Authentication session expired. Please try again.',
      };
      let text = errorMessages[oauthError] || 'Authentication failed. Please try again.';
      if (oauthMessage) {
        text += ` Reason: ${decodeURIComponent(oauthMessage)}`;
      }
      toast.error(text, { duration: 6000 });
      window.history.replaceState({}, document.title, '/login');
      return;
    }

    if (!oauthToken) return;

    const handleOAuthSuccess = async () => {
      try {
        const response = await getMeWithToken(oauthToken);
        login(response.data, oauthToken);
        window.history.replaceState({}, document.title, '/login');
        toast.success(`Welcome back, ${response.data.name}!`);
        const destination = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : from;
        navigate(destination, { replace: true });
      } catch (error) {
        console.error('OAuth token verification error:', error);
        toast.error('Authentication verification failed.');
      }
    };

    handleOAuthSuccess();
  }, [login, navigate, from]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = form.email ? form.email.trim() : '';
    const password = form.password;

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const { data } = await loginUser({ email, password });
      login(data, data.token);
      toast.success(`Welcome back, ${data.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthRedirect = (provider) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const safeClient = encodeURIComponent(window.location.origin);
    const safeReturn = encodeURIComponent(from || '/home');
    window.location.href = `${apiBase}/api/auth/${provider}?returnTo=${safeReturn}&clientUrl=${safeClient}`;
  };

  return (
    <div className="login-split-page">
      {/* ─── Left Section: Login Form & Platform Identity ─── */}
      <section className="login-left-section">
        <div className="login-form-container">
          {/* Brand Logo */}
          <div className="login-brand-header anim-stagger-1">
            <Link to="/" className="brand-link" aria-label="HireMySkills Home">
              <div className="brand-logo-icon">
                <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="3" fill="#F5A623" />
                  <rect x="18" y="2" width="12" height="12" rx="3" fill="#F5A623" opacity="0.5" />
                  <rect x="2" y="18" width="12" height="12" rx="3" fill="#F5A623" opacity="0.5" />
                  <rect x="18" y="18" width="12" height="12" rx="3" fill="#F5A623" />
                </svg>
              </div>
              <span className="brand-logo-text">HireMySkills</span>
            </Link>
          </div>

          {/* Heading and Subtitle */}
          <div className="login-headline-group anim-stagger-2">
            <h1 className="login-heading">Welcome back</h1>
            <p className="login-subheading">
              Log in to your account to collaborate on projects, submit proposals, and grow your freelance career.
            </p>
          </div>

          {/* Login Form */}
          <form className="login-main-form" onSubmit={handleSubmit} noValidate>
            {/* Email Input */}
            <div className="field-group anim-stagger-3">
              <label htmlFor="login-email" className="field-label">
                Email address
              </label>
              <div className="input-container">
                <Mail className="input-icon" size={17} />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="field-group anim-stagger-4">
              <div className="field-header-row">
                <label htmlFor="login-password" className="field-label">
                  Password
                </label>
                <Link to="/forgot-password" className="forgot-pw-link">
                  Forgot password?
                </Link>
              </div>
              <div className="input-container">
                <Lock className="input-icon" size={17} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-submit-group anim-stagger-5">
              <button
                id="login-submit"
                type="submit"
                className="submit-login-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-spinner" />
                ) : (
                  <>
                    <span>Log In</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Social Divider */}
          <div className="auth-divider anim-stagger-6">
            <span>or continue with</span>
          </div>

          {/* OAuth Buttons */}
          <div className="oauth-grid anim-stagger-6">
            <button
              id="google-login"
              className="oauth-action-btn"
              type="button"
              onClick={() => handleOAuthRedirect('google')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              <span>Google</span>
            </button>

            <button
              id="github-login"
              className="oauth-action-btn"
              type="button"
              onClick={() => handleOAuthRedirect('github')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="signup-switch-row anim-stagger-7">
            <span>Don't have an account?</span>{' '}
            <Link to="/signup" state={{ from }} className="signup-switch-link">
              Sign up for free
            </Link>
          </div>

          {/* Minimal Footer */}
          <footer className="login-minimal-footer anim-stagger-7">
            <span>© 2026 HireMySkills</span>
            <div className="footer-links-group">
              <a href="#">Privacy</a>
              <span className="footer-dot">·</span>
              <a href="#">Terms</a>
              <span className="footer-dot">·</span>
              <a href="#">Contact</a>
            </div>
          </footer>
        </div>
      </section>

      {/* ─── Right Section: Plain White, Clean & Uncluttered ─── */}
      <section className="login-right-section" aria-hidden="true">
        {/* Left intentionally plain white, clean, and open */}
      </section>
    </div>
  );
};

export default LoginPage;