import { useState, useEffect } from 'react';
import {
  X, Mail, MapPin, Globe, Phone,
  Briefcase, ExternalLink, ShieldCheck, Sparkles, Layers,
  Award, GraduationCap
} from 'lucide-react';
import { getUserProfile } from '../services/api';
import './UserProfileModal.css';

// Inline brand icons (lucide-react dropped Github/Linkedin/Twitter)
const GithubIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const LinkedinIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.69a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z"/>
  </svg>
);

const UserProfileModal = ({ userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        setLoading(true);
        const { data } = await getUserProfile(userId);
        setProfile(data);
      } catch (err) {
        // Failed
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (!userId) return null;

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="candidate-portfolio-modal page-enter" onClick={e => e.stopPropagation()}>
        <button className="candidate-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        {loading ? (
          <div className="modal-loading-center">
            <div className="spinner-gold" />
            <p>Loading candidate portfolio...</p>
          </div>
        ) : !profile ? (
          <div className="modal-empty-center">
            <h3>Portfolio Unavailable</h3>
            <p>Could not load details for this applicant.</p>
          </div>
        ) : (
          <div className="candidate-modal-content">
            {/* Header Banner */}
            <div className="candidate-header">
              <div className="candidate-avatar">
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt={profile.name} />
                ) : (
                  <span>{initials}</span>
                )}
                <span className="candidate-verified"><ShieldCheck size={14} /></span>
              </div>

              <div className="candidate-info">
                <h2 className="candidate-name">{profile.name}</h2>
                <p className="candidate-tagline">{profile.tagline || 'Student & Project Collaborator'}</p>

                <div className="candidate-meta">
                  {profile.location && <span><MapPin size={13} /> {profile.location}</span>}
                  <span><Mail size={13} /> {profile.email}</span>
                  {profile.contactNumber && <span><Phone size={13} /> {profile.contactNumber}</span>}
                </div>

                {/* Social Links */}
                <div className="candidate-socials">
                  {profile.socialLinks?.github || profile.githubLink ? (
                    <a href={profile.socialLinks?.github || profile.githubLink} target="_blank" rel="noreferrer" className="social-pill-sm">
                      <GithubIcon size={13} /> GitHub
                    </a>
                  ) : null}
                  {profile.socialLinks?.linkedin && (
                    <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="social-pill-sm">
                      <LinkedinIcon size={13} /> LinkedIn
                    </a>
                  )}
                  {profile.socialLinks?.portfolio && (
                    <a href={profile.socialLinks.portfolio} target="_blank" rel="noreferrer" className="social-pill-sm">
                      <Globe size={13} /> Portfolio
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* About & Bio */}
            {profile.bio && (
              <div className="candidate-bio-box">
                <h4>About Candidate</h4>
                <p>{profile.bio}</p>
              </div>
            )}

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div className="candidate-skills-box">
                <h4>Skills & Proficiency</h4>
                <div className="candidate-skills-list">
                  {profile.skills.map((sk, idx) => (
                    <span key={idx} className="candidate-skill-badge">
                      <Sparkles size={11} color="var(--gold)" /> {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs Navigation */}
            <div className="candidate-tabs">
              <button
                className={`candidate-tab ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveTab('projects')}
              >
                <Layers size={14} /> Projects ({profile.portfolioProjects?.length || 0})
              </button>
              <button
                className={`candidate-tab ${activeTab === 'experience' ? 'active' : ''}`}
                onClick={() => setActiveTab('experience')}
              >
                <Briefcase size={14} /> Experience ({profile.experience?.length || 0})
              </button>
              <button
                className={`candidate-tab ${activeTab === 'certifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('certifications')}
              >
                <Award size={14} /> Certifications ({profile.certifications?.length || 0})
              </button>
              <button
                className={`candidate-tab ${activeTab === 'education' ? 'active' : ''}`}
                onClick={() => setActiveTab('education')}
              >
                <GraduationCap size={14} /> Education ({profile.education?.length || 0})
              </button>
            </div>

            {/* Tab 1: Showcase Projects */}
            {activeTab === 'projects' && (
              <div className="candidate-tab-body">
                {profile.portfolioProjects?.length > 0 ? (
                  <div className="candidate-projects-grid">
                    {profile.portfolioProjects.map((proj, idx) => (
                      <div key={idx} className="candidate-proj-card">
                        <div className="flex-between">
                          <h5 className="proj-title-sm">{proj.title}</h5>
                          <div className="flex-center gap-6">
                            {proj.githubLink && (
                              <a href={proj.githubLink} target="_blank" rel="noreferrer" className="icon-link-sm" title="Code Repo">
                                <GithubIcon size={13} />
                              </a>
                            )}
                            {proj.liveLink && (
                              <a href={proj.liveLink} target="_blank" rel="noreferrer" className="icon-link-sm" title="Live Demo">
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="proj-desc-sm">{proj.description}</p>
                        {proj.tags?.length > 0 && (
                          <div className="flex-wrap gap-4" style={{ display: 'flex', marginTop: 8 }}>
                            {proj.tags.map((t, i) => (
                              <span key={i} className="proj-tag-sm">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-subtext-center">No featured projects listed by this candidate.</p>
                )}
              </div>
            )}

            {/* Tab 2: Experience */}
            {activeTab === 'experience' && (
              <div className="candidate-tab-body">
                {profile.experience?.length > 0 ? (
                  <div className="candidate-exp-list">
                    {profile.experience.map((exp, idx) => (
                      <div key={idx} className="candidate-exp-card">
                        <div className="flex-between">
                          <div>
                            <h5 className="exp-role">{exp.title}</h5>
                            <span className="exp-org">{exp.company}</span>
                          </div>
                          <span className="exp-dur">{exp.duration}</span>
                        </div>
                        {exp.description && <p className="exp-body">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-subtext-center">No experience entries listed by this candidate.</p>
                )}
              </div>
            )}

            {/* Tab 3: Certifications */}
            {activeTab === 'certifications' && (
              <div className="candidate-tab-body">
                {profile.certifications?.length > 0 ? (
                  <div className="candidate-projects-grid">
                    {profile.certifications.map((cert, idx) => (
                      <div key={idx} className="candidate-proj-card">
                        <div className="flex-between">
                          <div>
                            <h5 className="proj-title-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Award size={14} color="var(--gold-dark)" /> {cert.name}
                            </h5>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cert.issuer} {cert.issueDate ? `· ${cert.issueDate}` : ''}</span>
                          </div>
                          {cert.credentialUrl && (
                            <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="icon-link-sm" title="View Credential">
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-subtext-center">No certifications listed by this candidate.</p>
                )}
              </div>
            )}

            {/* Tab 4: Education */}
            {activeTab === 'education' && (
              <div className="candidate-tab-body">
                {profile.education?.length > 0 ? (
                  <div className="candidate-exp-list">
                    {profile.education.map((edu, idx) => (
                      <div key={idx} className="candidate-exp-card">
                        <div className="flex-between">
                          <div>
                            <h5 className="exp-role">{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</h5>
                            <span className="exp-org">{edu.institution}</span>
                          </div>
                          <span className="exp-dur">{edu.year}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-subtext-center">No education details listed by this candidate.</p>
                )}
              </div>
            )}

            <div className="candidate-modal-footer">
              <a href={`mailto:${profile.email}`} className="btn-primary full-w-btn flex-center gap-8">
                <Mail size={15} /> Contact {profile.name}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileModal;
