import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, UserCheck, UserX, Eye, Briefcase,
  Mail, MapPin, Phone, Sparkles, Clock, CheckCircle2,
  Filter, Award, GraduationCap, Check, ExternalLink, Globe,
  Shield, AlertCircle, Send, MessageSquare, ChevronRight,
  Layers, CheckCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import UserProfileModal from '../components/UserProfileModal';
import { useAuth } from '../context/AuthContext';
import { getProjectApplications, updateApplicationStatus, getProjectById } from '../services/api';
import toast from 'react-hot-toast';
import './ReviewApplicationsPage.css';

// Inline brand icon
const GithubIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const STATUS_MAP = {
  pending: { label: 'Pending Review', color: '#B37400', bg: 'rgba(245, 166, 35, 0.12)', icon: Clock },
  approved: { label: 'Accepted / Team Member', color: '#2E7D32', bg: 'rgba(76, 175, 80, 0.12)', icon: CheckCircle2 },
  rejected: { label: 'Temporarily Declined', color: '#C62828', bg: 'rgba(244, 67, 54, 0.12)', icon: UserX },
  temporarily_declined: { label: 'Temporarily Declined', color: '#C62828', bg: 'rgba(244, 67, 54, 0.12)', icon: UserX },
};

const ReviewApplicationsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [appsRes, projRes] = await Promise.all([
        getProjectApplications(projectId),
        getProjectById(projectId),
      ]);
      const appData = appsRes.data || [];
      setApplications(appData);
      setProject(projRes.data || null);

      if (appData.length > 0) {
        setSelectedApp((prev) => {
          if (!prev) return appData[0];
          const updated = appData.find((a) => a._id === prev._id);
          return updated || appData[0];
        });
      } else {
        setSelectedApp(null);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('You are not authorized to review applications for this project.');
        navigate('/home');
      } else {
        toast.error('Failed to load applications');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, fetchData]);

  const handleUpdateStatus = async (appId, status) => {
    setActionLoading(appId + status);
    try {
      const targetStatus =
        status === 'rejected' || status === 'decline' ? 'temporarily_declined' : status;

      await updateApplicationStatus(appId, targetStatus);

      setApplications((prev) =>
        prev.map((a) =>
          a._id === appId
            ? {
                ...a,
                status: targetStatus,
                declinedAt: targetStatus === 'temporarily_declined' ? new Date() : undefined,
                expiresAt:
                  targetStatus === 'temporarily_declined'
                    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    : undefined,
              }
            : a
        )
      );

      if (selectedApp?._id === appId) {
        setSelectedApp((prev) => ({
          ...prev,
          status: targetStatus,
          declinedAt: targetStatus === 'temporarily_declined' ? new Date() : undefined,
          expiresAt:
            targetStatus === 'temporarily_declined'
              ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              : undefined,
        }));
      }

      if (targetStatus === 'approved') {
        toast.success('Application accepted! Candidate added to project team and granted chat access.');
      } else {
        toast.success('Application moved to Temporarily Declined (7-day retention period).');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  const filtered = applications.filter((a) => {
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'approved') return a.status === 'approved';
    if (filter === 'declined' || filter === 'temporarily_declined') {
      return a.status === 'temporarily_declined' || a.status === 'rejected';
    }
    return true;
  });

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    declined: applications.filter(
      (a) => a.status === 'temporarily_declined' || a.status === 'rejected'
    ).length,
  };

  // Skill Match computation for selected candidate
  const matchStats = useMemo(() => {
    if (!selectedApp?.applicant || !project) return { pct: 0, matched: [], totalReq: 0 };

    const reqSkills = (project.skillRequirements || []).map((s) => s.toLowerCase().trim());
    const candSkills = (selectedApp.applicant.skills || []).map((s) => s.toLowerCase().trim());

    if (reqSkills.length === 0) return { pct: 100, matched: candSkills, totalReq: 0 };

    const matched = reqSkills.filter((rs) =>
      candSkills.some((cs) => cs.includes(rs) || rs.includes(cs))
    );

    const pct = Math.round((matched.length / reqSkills.length) * 100);
    return { pct, matched, totalReq: reqSkills.length };
  }, [selectedApp, project]);

  if (loading) {
    return (
      <div className="review-page-wrapper">
        <Navbar />
        <div className="review-loading-center">
          <div className="spinner-gold" />
          <p>Loading candidate applications...</p>
        </div>
      </div>
    );
  }

  const applicant = selectedApp?.applicant || {};
  const statusInfo = STATUS_MAP[selectedApp?.status] || STATUS_MAP.pending;
  const StatusIcon = statusInfo.icon;
  const isAccepted = selectedApp?.status === 'approved';
  const isDeclined =
    selectedApp?.status === 'temporarily_declined' || selectedApp?.status === 'rejected';

  return (
    <div className="review-page-wrapper">
      <Navbar />

      <main className="review-container page-enter">
        {/* Top Header Bar */}
        <div className="review-header">
          <div className="flex-center gap-12">
            <button type="button" className="back-btn" onClick={() => navigate(-1)} title="Go back">
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <div className="review-proj-pill">
                <Briefcase size={12} /> Project Review
              </div>
              <h1 className="review-title">{project?.title || 'Project Applications'}</h1>
              <p className="review-subtitle">
                Evaluate candidates, compare skills, and accept applicants into your project team space.
              </p>
            </div>
          </div>

          <div className="review-header-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/chat/${projectId}`)}
            >
              <MessageSquare size={15} /> Team Chat Space
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="review-filter-bar">
          <button
            type="button"
            className={`review-tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Candidates ({counts.all})
          </button>
          <button
            type="button"
            className={`review-tab-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <Clock size={13} /> Pending ({counts.pending})
          </button>
          <button
            type="button"
            className={`review-tab-btn ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            <CheckCircle2 size={13} /> Accepted ({counts.approved})
          </button>
          <button
            type="button"
            className={`review-tab-btn ${filter === 'declined' ? 'active' : ''}`}
            onClick={() => setFilter('declined')}
          >
            <UserX size={13} /> Temporarily Declined ({counts.declined})
          </button>
        </div>

        {/* Two-Column Review Layout */}
        <div className="review-layout-grid">
          {/* ================= LEFT SIDEBAR: Candidate Queue ================= */}
          <aside className="review-sidebar">
            <div className="sidebar-header-row">
              <span className="queue-label">Applicants Queue ({filtered.length})</span>
            </div>

            {filtered.length === 0 ? (
              <div className="no-candidates-box">
                <Users size={28} color="var(--text-muted)" />
                <p>No candidates in this view.</p>
              </div>
            ) : (
              <div className="candidates-scroll-list">
                {filtered.map((app) => {
                  const cand = app.applicant || {};
                  const isSelected = selectedApp?._id === app._id;
                  const candStatus = STATUS_MAP[app.status] || STATUS_MAP.pending;

                  // Quick match score for card
                  const req = (project?.skillRequirements || []).map((s) => s.toLowerCase());
                  const has = (cand.skills || []).map((s) => s.toLowerCase());
                  const matchCount = req.filter((rs) => has.some((cs) => cs.includes(rs))).length;

                  return (
                    <div
                      key={app._id}
                      className={`candidate-queue-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedApp(app)}
                    >
                      <div className="flex-between">
                        <div className="cand-card-user">
                          <div className="cand-avatar-sm">
                            {cand.profilePicture ? (
                              <img src={cand.profilePicture} alt={cand.name || ''} />
                            ) : (
                              <span>{cand.name?.[0]?.toUpperCase() || '?'}</span>
                            )}
                          </div>
                          <div>
                            <span className="cand-card-name">{cand.name || 'Candidate'}</span>
                            <span className="cand-card-tagline">
                              {cand.tagline || 'Applicant'}
                            </span>
                          </div>
                        </div>

                        {req.length > 0 && (
                          <span className="match-pill-mini">
                            {matchCount}/{req.length} Match
                          </span>
                        )}
                      </div>

                      <div className="cand-card-footer">
                        <span
                          className="cand-status-pill"
                          style={{ background: candStatus.bg, color: candStatus.color }}
                        >
                          {candStatus.label}
                        </span>
                        <span className="cand-card-date">
                          {new Date(app.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          {/* ================= RIGHT MAIN: Complete Candidate Evaluation ================= */}
          <section className="review-canvas">
            {!selectedApp ? (
              <div className="review-empty-canvas">
                <Users size={36} color="var(--gold)" />
                <h3>Select a Candidate to Review</h3>
                <p>Choose an applicant from the left queue to view their full portfolio, skill match, and pitch.</p>
              </div>
            ) : (
              <div className="candidate-detail-pane page-enter">
                {/* Top Profile Header */}
                <div className="cand-profile-hero">
                  <div className="hero-top-row">
                    <div className="cand-hero-info">
                      <div className="cand-hero-avatar">
                        {applicant.profilePicture ? (
                          <img src={applicant.profilePicture} alt={applicant.name || ''} />
                        ) : (
                          <span>{applicant.name?.[0]?.toUpperCase() || 'C'}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex-center gap-8" style={{ justifyContent: 'flex-start' }}>
                          <h2 className="cand-hero-name">{applicant.name || 'Anonymous Candidate'}</h2>
                          <span
                            className="cand-status-pill"
                            style={{ background: statusInfo.bg, color: statusInfo.color }}
                          >
                            <StatusIcon size={12} /> {statusInfo.label}
                          </span>
                        </div>
                        <p className="cand-hero-tagline">{applicant.tagline || 'Software Contributor'}</p>

                        <div className="cand-meta-tags">
                          {applicant.location && (
                            <span className="meta-tag">
                              <MapPin size={12} /> {applicant.location}
                            </span>
                          )}
                          {applicant.contactNumber && (
                            <span className="meta-tag">
                              <Phone size={12} /> {applicant.contactNumber}
                            </span>
                          )}
                          {applicant.email && (
                            <span className="meta-tag">
                              <Mail size={12} /> {applicant.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Social links */}
                    <div className="cand-social-links">
                      {applicant.githubLink && (
                        <a
                          href={applicant.githubLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-icon-btn"
                          title="GitHub Profile"
                        >
                          <GithubIcon size={15} />
                        </a>
                      )}
                      {applicant.socialLinks?.portfolio && (
                        <a
                          href={applicant.socialLinks.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="social-icon-btn"
                          title="Portfolio Website"
                        >
                          <Globe size={15} />
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => setSelectedProfileId(applicant._id)}
                      >
                        <Eye size={13} /> Full Portfolio Modal
                      </button>
                    </div>
                  </div>
                </div>

                {/* Skill Match Evaluation Banner */}
                {matchStats.totalReq > 0 && (
                  <div className="match-banner">
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <div className="flex-center gap-8">
                        <CheckCheck size={16} color="var(--gold-dark)" />
                        <span className="match-banner-title">
                          Skill Match: {matchStats.matched.length} of {matchStats.totalReq} Required Skills ({matchStats.pct}%)
                        </span>
                      </div>
                      <span className="match-quality-badge">
                        {matchStats.pct >= 75
                          ? 'High Match'
                          : matchStats.pct >= 40
                          ? 'Moderate Fit'
                          : 'Potential Candidate'}
                      </span>
                    </div>
                    <div className="match-progress-track">
                      <div
                        className="match-progress-fill"
                        style={{ width: `${Math.max(matchStats.pct, 8)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Application Pitch Note */}
                <div className="review-section-card">
                  <h4 className="section-card-title">
                    <Send size={14} /> Application Pitch &amp; Message
                  </h4>
                  <div className="pitch-quote-box">
                    <p className="pitch-text">
                      {selectedApp.message
                        ? `"${selectedApp.message}"`
                        : 'The candidate did not include an additional pitch note.'}
                    </p>
                  </div>
                </div>

                {/* Skills Inventory */}
                <div className="review-section-card">
                  <h4 className="section-card-title">Skills &amp; Capabilities</h4>
                  <div className="cand-skills-flow">
                    {(applicant.skills || []).map((skill, idx) => {
                      const isRequired = (project?.skillRequirements || []).some(
                        (rs) =>
                          rs.toLowerCase().includes(skill.toLowerCase()) ||
                          skill.toLowerCase().includes(rs.toLowerCase())
                      );
                      return (
                        <span
                          key={idx}
                          className={`cand-skill-chip ${isRequired ? 'matched' : ''}`}
                        >
                          {isRequired && <Check size={12} />} {skill}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Portfolio Projects */}
                {applicant.portfolioProjects?.length > 0 && (
                  <div className="review-section-card">
                    <h4 className="section-card-title">
                      <Briefcase size={14} /> Portfolio Projects ({applicant.portfolioProjects.length})
                    </h4>
                    <div className="portfolio-cards-grid">
                      {applicant.portfolioProjects.map((p, idx) => (
                        <div key={idx} className="cand-proj-card">
                          <div className="flex-between">
                            <span className="cand-proj-title">{p.title}</span>
                            <div className="cand-proj-links">
                              {p.liveLink && (
                                <a
                                  href={p.liveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Live Demo"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}
                              {p.githubLink && (
                                <a
                                  href={p.githubLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Repository"
                                >
                                  <GithubIcon size={13} />
                                </a>
                              )}
                            </div>
                          </div>
                          {p.description && (
                            <p className="cand-proj-desc">{p.description}</p>
                          )}
                          {p.tags?.length > 0 && (
                            <div className="cand-proj-tags">
                              {p.tags.map((t, i) => (
                                <span key={i} className="proj-tag-sm">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Experience */}
                {applicant.experience?.length > 0 && (
                  <div className="review-section-card">
                    <h4 className="section-card-title">
                      <Clock size={14} /> Work &amp; Project Experience
                    </h4>
                    <div className="timeline-list">
                      {applicant.experience.map((exp, idx) => (
                        <div key={idx} className="timeline-item">
                          <div className="timeline-bullet" />
                          <div className="timeline-content">
                            <span className="timeline-role">{exp.title}</span>
                            <span className="timeline-company">
                              {exp.company} {exp.duration && `· ${exp.duration}`}
                            </span>
                            {exp.description && (
                              <p className="timeline-desc">{exp.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications & Education Grid */}
                <div className="split-two-col">
                  {/* Certifications */}
                  <div className="review-section-card">
                    <h4 className="section-card-title">
                      <Award size={14} /> Certifications
                    </h4>
                    {applicant.certifications?.length > 0 ? (
                      <div className="mini-record-list">
                        {applicant.certifications.map((c, idx) => (
                          <div key={idx} className="mini-record-item">
                            <span className="record-title">{c.name}</span>
                            <span className="record-subtitle">
                              {c.issuer} {c.issueDate && `· ${c.issueDate}`}
                            </span>
                            {c.credentialUrl && (
                              <a
                                href={c.credentialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="record-link"
                              >
                                Verify Credential <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-text">No certifications listed.</p>
                    )}
                  </div>

                  {/* Education */}
                  <div className="review-section-card">
                    <h4 className="section-card-title">
                      <GraduationCap size={14} /> Education
                    </h4>
                    {applicant.education?.length > 0 ? (
                      <div className="mini-record-list">
                        {applicant.education.map((edu, idx) => (
                          <div key={idx} className="mini-record-item">
                            <span className="record-title">{edu.institution}</span>
                            <span className="record-subtitle">
                              {edu.degree} {edu.fieldOfStudy && `in ${edu.fieldOfStudy}`}{' '}
                              {edu.year && `(${edu.year})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-text">No education records listed.</p>
                    )}
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="review-action-footer">
                  <div className="footer-status-summary">
                    <span className="footer-cand-info">
                      Reviewing: <strong>{applicant.name}</strong> ({statusInfo.label})
                    </span>
                  </div>

                  <div className="flex-center gap-12">
                    {/* Decline Action */}
                    {!isDeclined && (
                      <button
                        type="button"
                        className="btn-secondary decline-btn"
                        onClick={() => handleUpdateStatus(selectedApp._id, 'temporarily_declined')}
                        disabled={actionLoading === selectedApp._id + 'temporarily_declined'}
                      >
                        <UserX size={15} />
                        {actionLoading === selectedApp._id + 'temporarily_declined'
                          ? 'Declining...'
                          : 'Decline Candidate'}
                      </button>
                    )}

                    {/* Accept / Shortlist Action */}
                    {!isAccepted ? (
                      <button
                        type="button"
                        className="btn-primary accept-btn"
                        onClick={() => handleUpdateStatus(selectedApp._id, 'approved')}
                        disabled={actionLoading === selectedApp._id + 'approved'}
                      >
                        <UserCheck size={16} />
                        {actionLoading === selectedApp._id + 'approved'
                          ? 'Accepting...'
                          : 'Accept & Add to Team'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ background: '#2E7D32', borderColor: '#2E7D32' }}
                        onClick={() => navigate(`/chat/${projectId}`)}
                      >
                        <MessageSquare size={15} /> Open Project Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Full User Portfolio Modal */}
      {selectedProfileId && (
        <UserProfileModal
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
    </div>
  );
};

export default ReviewApplicationsPage;