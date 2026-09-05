import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, GitBranch, ArrowRight, Plus, X } from 'lucide-react';
import { registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, skills };
      const { data } = await registerUser(payload);
      login(data, data.token);
      toast.success(`Welcome to HireMySkills, ${data.name}!`);
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-left">
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

          <p className="signup-prompt" style={{ marginTop: 20 }}>
            Already have an account? <Link to="/login" className="text-gold fw-600">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
