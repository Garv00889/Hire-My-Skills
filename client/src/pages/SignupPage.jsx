import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, GitBranch, ArrowRight, Plus, X } from 'lucide-react';
import { registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import toast from 'react-hot-toast';
import './SignupPage.css';

const SignupPage = () => {
  const [form, setForm] = useState({
    name: '', email: '', contactNumber: '', githubLink: '',
    age: '', password: '', confirmPassword: '',
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = location.state?.from;
  const from = (rawFrom && rawFrom !== '/login' && rawFrom !== '/signup') ? rawFrom : '/home';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s) && skills.length < 10) {
      setSkills([...skills, s]);
      setSkillInput('');
    }
  };
  const removeSkill = (sk) => setSkills(skills.filter(s => s !== sk));
  const handleSkillKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name ? form.name.trim() : '';
    const email = form.email ? form.email.trim() : '';
    const password = form.password;

    if (!name || !email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        name,
        email,
        skills,
      };
      const { data } = await registerUser(payload);
      login(data, data.token);
      toast.success(`Welcome to HireMySkills, ${data.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page page-enter">
      <div className="signup-container">
        <div className="signup-left">
        <div className="login-logo">
          <div className="logo-icon">
            <BrandLogo size={32} />
          </div>
          <span>HireMySkills</span>
        </div>
        <h1 className="signup-headline">
          Join the<br />
          <span className="text-gold">Community.</span><br />
          Build Together.
        </h1>
        <p className="login-subtext">
          Create your profile, showcase your skills, and start collaborating on real projects with talented students worldwide.
        </p>
        <div className="signup-stats">
          <div className="stat"><span className="stat-num">25K+</span><span>Students</span></div>
          <div className="stat"><span className="stat-num">5K+</span><span>Projects</span></div>
          <div className="stat"><span className="stat-num">98%</span><span>Happy</span></div>
        </div>
      </div>

      <div className="signup-right">
        <div className="signup-card">
          {/* Mobile brand header (shown only when sections stack on mobile) */}
          <div className="mobile-brand-row">
            <Link to="/" className="brand-logo-link" aria-label="HireMySkills Home">
              <div className="brand-logo-badge">
                <BrandLogo size={28} />
              </div>
              <span className="brand-logo-name">HireMySkills</span>
            </Link>
          </div>

          <div className="login-card-header">
            <h2>Create your account</h2>
            <p>Fill in the details to get started</p>
          </div>

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">User name *</label>
                <div className="input-field">
                  <User size={16} color="var(--text-muted)" />
                  <input id="signup-name" type="text" name="name" placeholder="Enter username" value={form.name} onChange={handleChange} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Age</label>
                <div className="input-field">
                  <input id="signup-age" type="number" name="age" placeholder="21" min="13" max="60" value={form.age} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Email Address *</label>
              <div className="input-field">
                <Mail size={16} color="var(--text-muted)" />
                <input id="signup-email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Contact Number</label>
              <div className="input-field">
                <Phone size={16} color="var(--text-muted)" />
                <input id="signup-contact" type="tel" name="contactNumber" placeholder="+91 98765 43210" value={form.contactNumber} onChange={handleChange} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">GitHub Profile Link</label>
              <div className="input-field">
                <GitBranch size={16} color="var(--text-muted)" />
                <input id="signup-github" type="url" name="githubLink" placeholder="https://github.com/username" value={form.githubLink} onChange={handleChange} />
              </div>
            </div>

            {/* Skills Input */}
            <div className="input-group">
              <label className="input-label">My Skills (press Enter to add)</label>
              <div className="input-field">
                <input
                  id="signup-skills"
                  type="text"
                  placeholder="e.g. React.js, Python, UI/UX..."
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                />
                <button type="button" className="add-skill-btn" onClick={addSkill}>
                  <Plus size={16} />
                </button>
              </div>
              {skills.length > 0 && (
                <div className="skill-chips">
                  {skills.map(sk => (
                    <span key={sk} className="skill-chip">
                      {sk}
                      <button type="button" onClick={() => removeSkill(sk)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Password *</label>
                <div className="input-field">
                  <Lock size={16} color="var(--text-muted)" />
                  <input id="signup-password" type={showPass ? 'text' : 'password'} name="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password *</label>
                <div className="input-field">
                  <Lock size={16} color="var(--text-muted)" />
                  <input id="signup-confirm-password" type="password" name="confirmPassword" placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} />
                </div>
              </div>
            </div>

            <button id="signup-submit" type="submit" className="btn-primary login-btn" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : <>Create Account <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="divider"><span>or continue with</span></div>

          <div className="oauth-buttons">
            <button
              id="google-signup"
              className="oauth-btn"
              type="button"
              onClick={() => {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const safeClient = encodeURIComponent(window.location.origin);
                const safeReturn = encodeURIComponent(from || '/home');
                window.location.href = `${apiBase}/api/auth/google?returnTo=${safeReturn}&clientUrl=${safeClient}`;
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              id="github-signup"
              className="oauth-btn"
              type="button"
              onClick={() => {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const safeClient = encodeURIComponent(window.location.origin);
                const safeReturn = encodeURIComponent(from || '/home');
                window.location.href = `${apiBase}/api/auth/github?returnTo=${safeReturn}&clientUrl=${safeClient}`;
              }}
            >
              <svg width="18" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          <p className="signup-prompt" style={{ marginTop: 20 }}>
            Already have an account? <Link to="/login" state={{ from }} className="text-gold fw-600">Login</Link>
          </p>
        </div>
      </div>
    </div>
  </div>
);
};

export default SignupPage;
