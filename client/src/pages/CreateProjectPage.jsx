import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Wrench, Users, AlignLeft, Upload, IndianRupee, BarChart2, Calendar, Grid, ArrowRight, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import { createProject } from '../services/api';
import toast from 'react-hot-toast';
import './CreateProjectPage.css';

const CATEGORIES = ['college project', 'business', 'corporate', 'UI/UX', 'webdev', 'AI', 'other'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const MEMBER_COUNTS = [1, 2, 3, 4, 5, 6];

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', skillRequirements: '',
    deadlineStart: '', deadlineEnd: '',
    membersRequired: 3,
    level: 'beginner',
    category: '',
    budget: '', currency: 'INR',
    githubRepo: '',
  });
  const [designFile, setDesignFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDesignFile(file);
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) { setDesignFile(file); if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Please fill in the required fields');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (designFile) formData.append('designFile', designFile);

      await createProject(formData);
      toast.success('Project created successfully!');
      navigate('/explore');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page page-enter">
      <Navbar />
      <div className="create-layout">
        {/* Left Panel */}
        <div className="create-left">
          <div className="tagline-badge">
            <Sparkles size={13} color="var(--gold-dark)" /> Let's turn your idea into impact
          </div>
          <h1 className="create-headline">
            Create a project.<br />
            <span className="text-gold">Build the future.</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 340 }}>
            Share your idea, add the details and find the right people to build it with you.
          </p>
          <div className="create-visual">
            <div className="create-orb" />
            <div className="create-cube">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect x="10" y="10" width="26" height="26" rx="6" fill="#F5A623" opacity="0.3" />
                <rect x="44" y="10" width="26" height="26" rx="6" fill="#F5A623" opacity="0.6" />
                <rect x="10" y="44" width="26" height="26" rx="6" fill="#F5A623" opacity="0.6" />
                <rect x="44" y="44" width="26" height="26" rx="6" fill="#F5A623" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="create-right">
          <div className="create-form-card">
            <div className="create-form-header">
              <div className="form-icon"><FileText size={22} color="var(--gold)" /></div>
              <div>
                <h2>Create Project</h2>
                <p>Fill in the details to get started</p>
              </div>
            </div>

            <form id="create-project-form" onSubmit={handleSubmit} className="create-form">
              {/* Title */}
              <div className="input-group">
                <label className="input-label">Project Title *</label>
                <div className="input-field">
                  <FileText size={16} color="var(--text-muted)" />
                  <input id="project-title" type="text" name="title" placeholder="Enter project title" value={form.title} onChange={handleChange} />
                </div>
              </div>

              {/* Skills */}
              <div className="input-group">
                <label className="input-label">Tools or Skill Requirements</label>
                <div className="input-field">
                  <Wrench size={16} color="var(--text-muted)" />
                  <input id="project-skills" type="text" name="skillRequirements" placeholder="e.g. React.js, Node.js, UI/UX Design" value={form.skillRequirements} onChange={handleChange} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Add tools, technologies or specific skills required</span>
              </div>

              {/* Members */}
              <div className="input-group">
                <label className="input-label">Number of Members Required</label>
                <div className="members-selector">
                  <button type="button" className={`member-btn ${form.membersRequired === 1 ? 'active' : ''}`} onClick={() => setForm({ ...form, membersRequired: 1 })}>
                    <Users size={16} />
                  </button>
                  {MEMBER_COUNTS.slice(1).map(n => (
                    <button key={n} type="button" className={`member-btn ${form.membersRequired === n ? 'active' : ''}`} onClick={() => setForm({ ...form, membersRequired: n })}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="input-group">
                <label className="input-label">Project Description *</label>
                <div className="input-field" style={{ alignItems: 'flex-start', padding: '12px 16px' }}>
                  <AlignLeft size={16} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <textarea
                    id="project-description"
                    name="description"
                    placeholder="Describe your project idea, goals, expectations and anything important for contributors to know..."
                    value={form.description}
                    onChange={(e) => { handleChange(e); setCharCount(e.target.value.length); }}
                    maxLength={1000}
                    rows={5}
                    style={{ resize: 'vertical', width: '100%', background: 'transparent', border: 'none', fontSize: 14 }}
                  />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{charCount} / 1000</span>
              </div>

              {/* Upload + Budget row */}
              <div className="two-col">
                <div className="input-group">
                  <label className="input-label">Upload Your Design <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
                  <div
                    id="design-dropzone"
                    className="upload-zone"
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => document.getElementById('design-file-input').click()}
                  >
                    {preview ? (
                      <div className="upload-preview">
                        <img src={preview} alt="preview" />
                        <button type="button" className="remove-preview" onClick={(e) => { e.stopPropagation(); setDesignFile(null); setPreview(null); }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} color="var(--text-muted)" />
                        <p style={{ fontSize: 13, textAlign: 'center' }}>Drag & drop your file here<br />
                          <span className="text-gold fw-600">or click to browse</span>
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG, PDF up to 10MB</p>
                      </>
                    )}
                    <input id="design-file-input" type="file" accept=".png,.jpg,.jpeg,.pdf,.svg,.fig" hidden onChange={handleFileChange} />
                  </div>
                  {designFile && !preview && (
                    <div className="file-chip">
                      <FileText size={14} /> {designFile.name}
                      <button type="button" onClick={() => setDesignFile(null)}><X size={12} /></button>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Enter Your Budget</label>
                  <div className="input-field">
                    <select name="currency" value={form.currency} onChange={handleChange} style={{ background: 'transparent', border: 'none', fontSize: 13, color: 'var(--text-secondary)', width: 'auto', paddingRight: 8 }}>
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                    </select>
                    <input id="project-budget" type="number" name="budget" placeholder="e.g. 5000" value={form.budget} onChange={handleChange} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Enter your estimated budget</span>
                </div>
              </div>

              {/* Level + Deadline row */}
              <div className="two-col">
                <div className="input-group">
                  <label className="input-label">Project Level</label>
                  <div className="level-selector">
                    {LEVELS.map(l => (
                      <button key={l} type="button" className={`level-btn ${l} ${form.level === l ? 'active' : ''}`} onClick={() => setForm({ ...form, level: l })}>
                        <BarChart2 size={14} />
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Deadline</label>
                  <div className="date-row">
                    <div className="date-col" style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Start Date</label>
                      <div className="input-field">
                        <Calendar size={14} color="var(--text-muted)" />
                        <input id="deadline-start" type="date" name="deadlineStart" value={form.deadlineStart} onChange={handleChange} />
                      </div>
                    </div>
                    <div style={{ marginTop: 22, padding: '0 8px' }}><ArrowRight size={16} color="var(--text-muted)" /></div>
                    <div className="date-col" style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>End Date</label>
                      <div className="input-field">
                        <Calendar size={14} color="var(--text-muted)" />
                        <input id="deadline-end" type="date" name="deadlineEnd" value={form.deadlineEnd} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="input-group">
                <label className="input-label">Project Category <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
                <div className="input-field">
                  <Grid size={16} color="var(--text-muted)" />
                  <select id="project-category" name="category" value={form.category} onChange={handleChange} style={{ background: 'transparent', border: 'none', fontSize: 14, color: form.category ? 'var(--text-primary)' : 'var(--text-muted)', flex: 1 }}>
                    <option value="">Select a category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit */}
              <button id="submit-create-project" type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 'var(--radius-md)', marginTop: 8 }} disabled={loading}>
                {loading ? <span className="btn-spinner" /> : <>Create Project <ArrowRight size={16} /></>}
              </button>

              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Lock size={12} /> Your project will be visible to other users after review.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectPage;
