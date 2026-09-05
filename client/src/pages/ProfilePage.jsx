import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  User, Mail, MapPin, Phone, Globe,
  Briefcase, Code, Plus, Trash2, Edit3, ExternalLink, ShieldCheck,
  Award, Sparkles, Check, X, Layers, ArrowRight, Star, GitBranch,
  GraduationCap
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getMe, updateProfile, getUserProfile } from '../services/api';
import toast from 'react-hot-toast';
import './ProfilePage.css';

// Custom Brand Icon Helpers
const GithubIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const LinkedinIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.69a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
  </svg>
);

const TwitterIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, login: updateAuthUser } = useAuth();

  const isOwnProfile = !userId || userId === currentUser?._id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'experience', 'about'

  // Edit Form States
  const [editForm, setEditForm] = useState({
    name: '',
    tagline: '',
    location: '',
    bio: '',
    contactNumber: '',
    profilePicture: '',
    skills: [],
    socialLinks: { github: '', linkedin: '', portfolio: '', twitter: '', dribbble: '' },
    portfolioProjects: [],
    experience: [],
    certifications: [],
    education: [],
  });

  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal project, experience, cert & edu item drafts
  const [newProject, setNewProject] = useState({ title: '', description: '', liveLink: '', githubLink: '', tags: '' });
  const [newExp, setNewExp] = useState({ title: '', company: '', duration: '', description: '' });
  const [newCert, setNewCert] = useState({ name: '', issuer: '', issueDate: '', credentialUrl: '' });
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', fieldOfStudy: '', year: '' });

  useEffect(() => {
    fetchProfileData();
  }, [userId, currentUser]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      if (isOwnProfile) {
        const { data } = await getMe();
        setProfile(data);
        initEditForm(data);
      } else {
        const { data } = await getUserProfile(userId);
        setProfile(data);
      }
    } catch (err) {
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const initEditForm = (data) => {
    setEditForm({
      name: data.name || '',
      tagline: data.tagline || '',
      location: data.location || '',
      bio: data.bio || '',
      contactNumber: data.contactNumber || '',
      profilePicture: data.profilePicture || '',
      skills: data.skills || [],
      socialLinks: {
        github: data.socialLinks?.github || data.githubLink || '',
        linkedin: data.socialLinks?.linkedin || '',
        portfolio: data.socialLinks?.portfolio || '',
        twitter: data.socialLinks?.twitter || '',
        dribbble: data.socialLinks?.dribbble || '',
      },
      portfolioProjects: data.portfolioProjects || [],
      experience: data.experience || [],
      certifications: data.certifications || [],
      education: data.education || [],
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await updateProfile(editForm);
      setProfile(data);
      if (isOwnProfile) {
        updateAuthUser(data, localStorage.getItem('hms_token'));
      }
      toast.success('Portfolio profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Add / Remove Skill
  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!editForm.skills.includes(newSkill.trim())) {
      setEditForm(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  // Add / Remove Project in Edit Form
  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      toast.error('Project title is required');
      return;
    }
    const tagsArray = typeof newProject.tags === 'string'
      ? newProject.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    setEditForm(prev => ({
      ...prev,
      portfolioProjects: [...prev.portfolioProjects, { ...newProject, tags: tagsArray }]
    }));

    setNewProject({ title: '', description: '', liveLink: '', githubLink: '', tags: '' });
  };

  const handleRemoveProject = (index) => {
    setEditForm(prev => ({
      ...prev,
      portfolioProjects: prev.portfolioProjects.filter((_, i) => i !== index)
    }));
  };

  // Add / Remove Experience in Edit Form
  const handleAddExperience = () => {
    if (!newExp.title.trim()) {
      toast.error('Experience title is required');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      experience: [...prev.experience, { ...newExp }]
    }));
    setNewExp({ title: '', company: '', duration: '', description: '' });
  };

  const handleRemoveExperience = (index) => {
    setEditForm(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  // Add / Remove Certification
  const handleAddCert = () => {
    if (!newCert.name.trim()) {
      toast.error('Certification name is required');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      certifications: [...(prev.certifications || []), { ...newCert }]
    }));
    setNewCert({ name: '', issuer: '', issueDate: '', credentialUrl: '' });
  };

  const handleRemoveCert = (index) => {
    setEditForm(prev => ({
      ...prev,
      certifications: (prev.certifications || []).filter((_, i) => i !== index)
    }));
  };

  // Add / Remove Education
  const handleAddEducation = () => {
    if (!newEdu.institution.trim()) {
      toast.error('Institution name is required');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      education: [...(prev.education || []), { ...newEdu }]
    }));
    setNewEdu({ institution: '', degree: '', fieldOfStudy: '', year: '' });
  };

  const handleRemoveEducation = (index) => {
    setEditForm(prev => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="profile-page-wrapper">
        <Navbar />
        <div className="profile-loading-center">
          <div className="spinner-gold" />
          <p>Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page-wrapper">
        <Navbar />
        <div className="profile-container empty-profile-center">
          <h2>User Not Found</h2>
          <p>The requested candidate profile does not exist.</p>
          <Link to="/explore" className="btn-primary">Explore Projects</Link>
        </div>
      </div>
    );
  }

  const initials = profile.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="profile-page-wrapper">
      <Navbar />

      <main className="profile-container page-enter">
        {/* ================= HEADER HERO CARD ================= */}
        <section className="profile-hero-card">
          <div className="hero-banner-accent" />
          <div className="hero-content">
            <div className="hero-avatar-wrapper">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt={profile.name} className="hero-avatar-img" />
              ) : (
                <div className="hero-avatar-initials">{initials}</div>
              )}
              <span className="verified-badge" title="Verified Candidate"><ShieldCheck size={14} /></span>
            </div>

            <div className="hero-details">
              <div className="flex-between flex-wrap gap-12">
                <div>
                  <h1 className="user-profile-name">{profile.name}</h1>
                  <p className="user-tagline">
                    {profile.tagline || 'Student & Project Collaborator'}
                  </p>
                </div>

                {isOwnProfile ? (
                  <button className="btn-primary edit-profile-btn" onClick={() => setIsEditing(true)}>
                    <Edit3 size={15} /> Edit Portfolio
                  </button>
                ) : (
                  <a
                    href={`mailto:${profile.email}`}
                    className="btn-primary contact-candidate-btn"
                  >
                    <Mail size={15} /> Contact Candidate
                  </a>
                )}
              </div>

              <div className="hero-meta-row">
                {profile.location && (
                  <span className="meta-item"><MapPin size={14} /> {profile.location}</span>
                )}
                <span className="meta-item"><Mail size={14} /> {profile.email}</span>
                {profile.contactNumber && (
                  <span className="meta-item"><Phone size={14} /> {profile.contactNumber}</span>
                )}
              </div>

              {/* Social Links Bar */}
              <div className="hero-social-bar">
                {profile.socialLinks?.github || profile.githubLink ? (
                  <a href={profile.socialLinks?.github || profile.githubLink} target="_blank" rel="noreferrer" className="social-pill" title="GitHub">
                    <GithubIcon size={15} /> <span>GitHub</span>
                  </a>
                ) : null}

                {profile.socialLinks?.linkedin && (
                  <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="social-pill" title="LinkedIn">
                    <LinkedinIcon size={15} /> <span>LinkedIn</span>
                  </a>
                )}

                {profile.socialLinks?.portfolio && (
                  <a href={profile.socialLinks.portfolio} target="_blank" rel="noreferrer" className="social-pill" title="Portfolio Website">
                    <Globe size={15} /> <span>Portfolio</span>
                  </a>
                )}

                {profile.socialLinks?.twitter && (
                  <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer" className="social-pill" title="Twitter / X">
                    <TwitterIcon size={15} /> <span>Twitter</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================= MAIN GRID LAYOUT ================= */}
        <div className="profile-grid-layout">
          {/* Left Column: Bio & Skills */}
          <aside className="profile-left-sidebar">
            {/* Bio Card */}
            <div className="glass-card bio-card">
              <h3 className="glass-card-title flex-between">
                <span>About Me</span>
                <User size={16} color="var(--gold-dark)" />
              </h3>
              <p className="bio-text">
                {profile.bio || "No bio added yet. Edit profile to share your story, passion, and project goals!"}
              </p>
            </div>

            {/* Skills & Badges Card */}
            <div className="glass-card skills-card">
              <h3 className="glass-card-title flex-between">
                <span>Skills & Expertise</span>
                <Code size={16} color="var(--gold-dark)" />
              </h3>

              {profile.skills && profile.skills.length > 0 ? (
                <div className="skills-badge-list">
                  {profile.skills.map((skill, idx) => (
                    <span key={idx} className="portfolio-skill-badge">
                      <Sparkles size={12} color="var(--gold)" /> {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="empty-subtext">No skills added yet.</p>
              )}
            </div>
          </aside>

          {/* Right Column: Portfolio Projects & Work Experience */}
          <section className="profile-main-content">
            {/* Section Tabs */}
            <div className="profile-tabs-header">
              <button
                className={`profile-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveTab('projects')}
              >
                <Layers size={16} /> Featured Projects ({profile.portfolioProjects?.length || 0})
              </button>
              <button
                className={`profile-tab-btn ${activeTab === 'experience' ? 'active' : ''}`}
                onClick={() => setActiveTab('experience')}
              >
                <Briefcase size={16} /> Experience ({profile.experience?.length || 0})
              </button>
              <button
                className={`profile-tab-btn ${activeTab === 'certifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('certifications')}
              >
                <Award size={16} /> Certifications ({profile.certifications?.length || 0})
              </button>
              <button
                className={`profile-tab-btn ${activeTab === 'education' ? 'active' : ''}`}
                onClick={() => setActiveTab('education')}
              >
                <GraduationCap size={16} /> Education ({profile.education?.length || 0})
              </button>
            </div>

            {/* TAB 1: FEATURED PROJECTS */}
            {activeTab === 'projects' && (
              <div className="tab-content-pane">
                {profile.portfolioProjects && profile.portfolioProjects.length > 0 ? (
                  <div className="portfolio-projects-grid">
                    {profile.portfolioProjects.map((proj, idx) => (
                      <div key={idx} className="portfolio-project-card">
                        <div className="proj-card-header flex-between">
                          <h4 className="proj-title">{proj.title}</h4>
                          <div className="proj-links flex-center gap-8">
                            {proj.githubLink && (
                              <a href={proj.githubLink} target="_blank" rel="noreferrer" className="icon-link-btn" title="GitHub Repo">
                                <GithubIcon size={15} />
                              </a>
                            )}
                            {proj.liveLink && (
                              <a href={proj.liveLink} target="_blank" rel="noreferrer" className="icon-link-btn" title="Live Preview">
                                <ExternalLink size={15} />
                              </a>
                            )}
                          </div>
                        </div>

                        <p className="proj-desc">{proj.description}</p>

                        {proj.tags && proj.tags.length > 0 && (
                          <div className="proj-tags-list">
                            {proj.tags.map((t, i) => (
                              <span key={i} className="proj-tag">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-portfolio-state">
                    <Layers size={36} color="var(--gold)" />
                    <h4>No Showcase Projects Yet</h4>
                    <p>Add your best projects, hackathons, or apps to showcase to project owners.</p>
                    {isOwnProfile && (
                      <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                        <Plus size={15} /> Add Showcase Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: WORK EXPERIENCE & ROLES */}
            {activeTab === 'experience' && (
              <div className="tab-content-pane">
                {profile.experience && profile.experience.length > 0 ? (
                  <div className="experience-timeline">
                    {profile.experience.map((exp, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-card">
                          <div className="exp-header flex-between">
                            <div>
                              <h4 className="exp-title">{exp.title}</h4>
                              <span className="exp-company">{exp.company}</span>
                            </div>
                            <span className="exp-duration">{exp.duration}</span>
                          </div>
                          {exp.description && <p className="exp-desc">{exp.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-portfolio-state">
                    <Briefcase size={36} color="var(--gold)" />
                    <h4>No Work Experience Listed</h4>
                    <p>Share your internships, college team roles, or open source contributions.</p>
                    {isOwnProfile && (
                      <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                        <Plus size={15} /> Add Experience Entry
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CERTIFICATIONS & CREDENTIALS */}
            {activeTab === 'certifications' && (
              <div className="tab-content-pane">
                {profile.certifications && profile.certifications.length > 0 ? (
                  <div className="portfolio-projects-grid">
                    {profile.certifications.map((cert, idx) => (
                      <div key={idx} className="portfolio-project-card">
                        <div className="proj-card-header flex-between">
                          <div>
                            <h4 className="proj-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Award size={16} color="var(--gold-dark)" /> {cert.name}
                            </h4>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{cert.issuer} {cert.issueDate ? `· ${cert.issueDate}` : ''}</span>
                          </div>
                          {cert.credentialUrl && (
                            <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="icon-link-btn" title="View Credential">
                              <ExternalLink size={15} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-portfolio-state">
                    <Award size={36} color="var(--gold)" />
                    <h4>No Certifications Listed</h4>
                    <p>Add technical licenses, course completions, and competitive certifications.</p>
                    {isOwnProfile && (
                      <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                        <Plus size={15} /> Add Certification
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: EDUCATION & ACADEMICS */}
            {activeTab === 'education' && (
              <div className="tab-content-pane">
                {profile.education && profile.education.length > 0 ? (
                  <div className="experience-timeline">
                    {profile.education.map((edu, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-card">
                          <div className="exp-header flex-between">
                            <div>
                              <h4 className="exp-title">{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</h4>
                              <span className="exp-company">{edu.institution}</span>
                            </div>
                            <span className="exp-duration">{edu.year}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-portfolio-state">
                    <GraduationCap size={36} color="var(--gold)" />
                    <h4>No Education Details Listed</h4>
                    <p>Add your college, degree, field of study, and graduation year.</p>
                    {isOwnProfile && (
                      <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                        <Plus size={15} /> Add Education
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ================= EDIT PORTFOLIO MODAL ================= */}
      {isEditing && (
        <div className="modal-overlay">
          <div className="edit-profile-modal page-enter">
            <div className="modal-header flex-between">
              <div>
                <h2>Edit Portfolio & Profile</h2>
                <p>Update your portfolio details to highlight your work to project owners.</p>
              </div>
              <button className="close-modal-btn" onClick={() => setIsEditing(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="edit-form-scrollable">
              {/* Basic Details */}
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Full Name *</label>
                    <input
                      type="text"
                      className="input-field-custom"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Headline / Role Tagline</label>
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="e.g. Full Stack Engineer | React & Node.js"
                      value={editForm.tagline}
                      onChange={e => setEditForm({ ...editForm, tagline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Location / University</label>
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="e.g. Mumbai, India / BTIT 2024"
                      value={editForm.location}
                      onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Contact Number</label>
                    <input
                      type="tel"
                      className="input-field-custom"
                      placeholder="+91 98765 43210"
                      value={editForm.contactNumber}
                      onChange={e => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Profile Picture URL</label>
                  <input
                    type="url"
                    className="input-field-custom"
                    placeholder="https://example.com/avatar.jpg"
                    value={editForm.profilePicture}
                    onChange={e => setEditForm({ ...editForm, profilePicture: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">About / Bio</label>
                  <textarea
                    className="input-field-custom textarea-custom"
                    rows="3"
                    placeholder="Tell project owners about your background, expertise, and what projects you want to build..."
                    value={editForm.bio}
                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="form-section">
                <h3>Social & Work Links</h3>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">GitHub URL</label>
                    <input
                      type="url"
                      className="input-field-custom"
                      placeholder="https://github.com/username"
                      value={editForm.socialLinks.github}
                      onChange={e => setEditForm({ ...editForm, socialLinks: { ...editForm.socialLinks, github: e.target.value } })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">LinkedIn URL</label>
                    <input
                      type="url"
                      className="input-field-custom"
                      placeholder="https://linkedin.com/in/username"
                      value={editForm.socialLinks.linkedin}
                      onChange={e => setEditForm({ ...editForm, socialLinks: { ...editForm.socialLinks, linkedin: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Personal Portfolio Website</label>
                    <input
                      type="url"
                      className="input-field-custom"
                      placeholder="https://myportfolio.com"
                      value={editForm.socialLinks.portfolio}
                      onChange={e => setEditForm({ ...editForm, socialLinks: { ...editForm.socialLinks, portfolio: e.target.value } })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Twitter / X URL</label>
                    <input
                      type="url"
                      className="input-field-custom"
                      placeholder="https://x.com/username"
                      value={editForm.socialLinks.twitter}
                      onChange={e => setEditForm({ ...editForm, socialLinks: { ...editForm.socialLinks, twitter: e.target.value } })}
                    />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="form-section">
                <h3>Skills & Technologies</h3>
                <div className="add-skill-row flex-center gap-8">
                  <input
                    type="text"
                    className="input-field-custom"
                    placeholder="Type a skill (e.g. React.js, Python, Figma) and click Add"
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                  />
                  <button type="button" className="btn-secondary" onClick={handleAddSkill}>
                    <Plus size={16} /> Add
                  </button>
                </div>
                <div className="skills-badge-list edit-skills-list" style={{ marginTop: 12 }}>
                  {editForm.skills.map((sk, idx) => (
                    <span key={idx} className="portfolio-skill-badge editable">
                      {sk}
                      <button type="button" onClick={() => handleRemoveSkill(sk)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Showcase Projects */}
              <div className="form-section">
                <h3>Featured Portfolio Projects</h3>
                <div className="sub-form-card">
                  <h4>Add New Showcase Project</h4>
                  <div className="form-grid-2">
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Project Title *"
                      value={newProject.title}
                      onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Tech Tags (comma separated e.g. React, Node)"
                      value={newProject.tags}
                      onChange={e => setNewProject({ ...newProject, tags: e.target.value })}
                    />
                  </div>
                  <div className="form-grid-2" style={{ marginTop: 8 }}>
                    <input
                      type="url"
                      className="input-field-custom"
                      placeholder="Live Demo URL"
                      value={newProject.liveLink}
                      onChange={e => setNewProject({ ...newProject, liveLink: e.target.value })}
                    />
                    <input
                      type="url"
                      className="input-field-custom"
                      placeholder="GitHub Repo URL"
                      value={newProject.githubLink}
                      onChange={e => setNewProject({ ...newProject, githubLink: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="input-field-custom textarea-custom"
                    rows="2"
                    style={{ marginTop: 8 }}
                    placeholder="Brief description of what you built..."
                    value={newProject.description}
                    onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  />
                  <button type="button" className="btn-secondary" style={{ marginTop: 10 }} onClick={handleAddProject}>
                    <Plus size={15} /> Add Project to Portfolio
                  </button>
                </div>

                {/* List of Projects Draft */}
                {editForm.portfolioProjects.length > 0 && (
                  <div className="edit-draft-list" style={{ marginTop: 14 }}>
                    {editForm.portfolioProjects.map((p, i) => (
                      <div key={i} className="draft-item flex-between">
                        <div>
                          <strong>{p.title}</strong>
                          <p className="text-muted-sm">{p.description}</p>
                        </div>
                        <button type="button" className="icon-btn-danger" onClick={() => handleRemoveProject(i)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience */}
              <div className="form-section">
                <h3>Work & Role Experience</h3>
                <div className="sub-form-card">
                  <h4>Add Experience Entry</h4>
                  <div className="form-grid-2">
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Role Title * (e.g. Frontend Intern)"
                      value={newExp.title}
                      onChange={e => setNewExp({ ...newExp, title: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Company / Team Name"
                      value={newExp.company}
                      onChange={e => setNewExp({ ...newExp, company: e.target.value })}
                    />
                  </div>
                  <div className="input-group" style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Duration (e.g. Jan 2024 - Present)"
                      value={newExp.duration}
                      onChange={e => setNewExp({ ...newExp, duration: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="input-field-custom textarea-custom"
                    rows="2"
                    style={{ marginTop: 8 }}
                    placeholder="Key responsibilities and achievements..."
                    value={newExp.description}
                    onChange={e => setNewExp({ ...newExp, description: e.target.value })}
                  />
                  <button type="button" className="btn-secondary" style={{ marginTop: 10 }} onClick={handleAddExperience}>
                    <Plus size={15} /> Add Experience Entry
                  </button>
                </div>

                {/* List of Experience Draft */}
                {editForm.experience.length > 0 && (
                  <div className="edit-draft-list" style={{ marginTop: 14 }}>
                    {editForm.experience.map((exp, i) => (
                      <div key={i} className="draft-item flex-between">
                        <div>
                          <strong>{exp.title}</strong> — <span>{exp.company}</span> ({exp.duration})
                        </div>
                        <button type="button" className="icon-btn-danger" onClick={() => handleRemoveExperience(i)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Certifications */}
              <div className="form-section">
                <h3>Certifications & Credentials</h3>
                <div className="sub-form-card">
                  <h4>Add Certification</h4>
                  <div className="form-grid-2">
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Certificate Name * (e.g. AWS Certified Cloud Practitioner)"
                      value={newCert.name}
                      onChange={e => setNewCert({ ...newCert, name: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Issuing Organization (e.g. Amazon Web Services)"
                      value={newCert.issuer}
                      onChange={e => setNewCert({ ...newCert, issuer: e.target.value })}
                    />
                  </div>
                  <div className="form-grid-2" style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Issue Date (e.g. June 2024)"
                      value={newCert.issueDate}
                      onChange={e => setNewCert({ ...newCert, issueDate: e.target.value })}
                    />
                    <input
                      type="url"
                      className="input-field-custom"
                      placeholder="Credential Verification URL"
                      value={newCert.credentialUrl}
                      onChange={e => setNewCert({ ...newCert, credentialUrl: e.target.value })}
                    />
                  </div>
                  <button type="button" className="btn-secondary" style={{ marginTop: 10 }} onClick={handleAddCert}>
                    <Plus size={15} /> Add Certification
                  </button>
                </div>

                {/* List of Certifications Draft */}
                {editForm.certifications?.length > 0 && (
                  <div className="edit-draft-list" style={{ marginTop: 14 }}>
                    {editForm.certifications.map((c, i) => (
                      <div key={i} className="draft-item flex-between">
                        <div>
                          <strong>{c.name}</strong> — <span>{c.issuer}</span> {c.issueDate ? `(${c.issueDate})` : ''}
                        </div>
                        <button type="button" className="icon-btn-danger" onClick={() => handleRemoveCert(i)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Education */}
              <div className="form-section">
                <h3>Education & Academics</h3>
                <div className="sub-form-card">
                  <h4>Add Education Entry</h4>
                  <div className="form-grid-2">
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="College / University / School *"
                      value={newEdu.institution}
                      onChange={e => setNewEdu({ ...newEdu, institution: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Degree (e.g. B.Tech, B.Sc)"
                      value={newEdu.degree}
                      onChange={e => setNewEdu({ ...newEdu, degree: e.target.value })}
                    />
                  </div>
                  <div className="form-grid-2" style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Field of Study (e.g. Computer Science)"
                      value={newEdu.fieldOfStudy}
                      onChange={e => setNewEdu({ ...newEdu, fieldOfStudy: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input-field-custom"
                      placeholder="Graduation Year (e.g. 2025)"
                      value={newEdu.year}
                      onChange={e => setNewEdu({ ...newEdu, year: e.target.value })}
                    />
                  </div>
                  <button type="button" className="btn-secondary" style={{ marginTop: 10 }} onClick={handleAddEducation}>
                    <Plus size={15} /> Add Education Entry
                  </button>
                </div>

                {/* List of Education Draft */}
                {editForm.education?.length > 0 && (
                  <div className="edit-draft-list" style={{ marginTop: 14 }}>
                    {editForm.education.map((edu, i) => (
                      <div key={i} className="draft-item flex-between">
                        <div>
                          <strong>{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</strong> — <span>{edu.institution}</span> ({edu.year})
                        </div>
                        <button type="button" className="icon-btn-danger" onClick={() => handleRemoveEducation(i)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer flex-between" style={{ marginTop: 24 }}>
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Portfolio Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
