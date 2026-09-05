import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Users, MessageSquare, Rocket, Sparkles } from 'lucide-react';
import { loginUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './LoginPage.css';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      login(data, data.token);
      toast.success(`Welcome back, ${data.name}!`);
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <div className="login-logo">
          <div className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="3" fill="#F5A623"/>
              <rect x="18" y="2" width="12" height="12" rx="3" fill="#F5A623" opacity="0.5"/>
              <rect x="2" y="18" width="12" height="12" rx="3" fill="#F5A623" opacity="0.5"/>
              <rect x="18" y="18" width="12" height="12" rx="3" fill="#F5A623"/>
            </svg>
          </div>
          <span>HireMySkills</span>
        </div>

        <div className="login-tagline">
          <div className="tagline-badge">
            <Sparkles size={13} color="var(--gold-dark)" /> Empowering Students. Building Futures.
          </div>
        </div>

        <h1 className="login-headline">
          Collaborate.<br />
          <span className="text-gold">Contribute.</span><br />
          Create Impact.
        </h1>

        <p className="login-subtext">
          HireMySkill is a platform where students connect,
          collaborate and create real world projects together.
        </p>

        <div className="login-features">
          <div className="feature-item">
            <div className="feature-icon"><Users size={20} /></div>
            <span>Find Talented<br />People</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><MessageSquare size={20} /></div>
            <span>Private Group<br />Chat</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><Rocket size={20} /></div>
            <span>Build & Grow<br />Together</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Card */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome back</h2>
            <p>Login to continue your journey</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <div className="input-field">
                <Mail size={16} color="var(--text-muted)" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-field">
                <Lock size={16} color="var(--text-muted)" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                </button>
              </div>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <button id="login-submit" type="submit" className="btn-primary login-btn" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : <>Login <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="divider"><span>or continue with</span></div>

          <div className="oauth-buttons">
            <button id="google-login" className="oauth-btn" onClick={() => window.location.href='http://localhost:5000/api/auth/google'}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button id="github-login" className="oauth-btn" onClick={() => window.location.href='http://localhost:5000/api/auth/github'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          <p className="signup-prompt">
            Don't have an account? <Link to="/signup" className="text-gold fw-600">Sign up</Link>
          </p>
        </div>
      </div>

      <div className="login-footer">
        <span>© 2026 HireMySkills. All rights reserved.</span>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
