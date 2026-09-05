import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Users, Clock, Briefcase, IndianRupee, Calendar,
  Check, ExternalLink, GitBranch, Shield, Send, ArrowRight,
  MessageSquare, UserCheck, Layers, FileText
} from 'lucide-react';
import { applyToProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './ProjectDetailsModal.css';

const ProjectDetailsModal = ({ project, onClose, onApplied }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);

  if (!project) return null;

  const creator = project.creator || {};
  const creatorId = creator._id || creator;
  const isCreator = user && (creatorId === user._id || creatorId?.toString() === user._id?.toString());
  const isMember = user && (project.members || []).some(
    (m) => (m._id || m).toString() === user._id?.toString()
  );

  const skills = Array.isArray(project.skillRequirements) ? project.skillRequirements : [];
  const members = Array.isArray(project.members) ? project.members : [];
  const membersRequired = project.membersRequired || 3;
  const seatsFilled = members.length;

  const handleApply = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to apply');
      navigate('/login');
      return;
    }
    if (isCreator) {
      toast.error('You cannot apply to your own project');
      return;
    }
    if (isMember) {
      toast.error('You are already an approved member of this project');
      return;
    }

    setApplying(true);
    try {
      await applyToProject(project._id, { message: applyMessage.trim() });
      toast.success('Application submitted successfully.');
      setApplyMessage('');
      if (onApplied) onApplied(project._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const getCategoryColor = (cat) => {
    const colors = {
      webdev: '#3B82F6',
      AI: '#8B5CF6',
      'UI/UX': '#EC4899',
      'college project': '#10B981',
      business: '#F59E0B',
      corporate: '#6366F1',
      other: '#6B7280',
    };
    return colors[cat] || '#6B7280';
  };

  const formattedDeadline = project.deadline?.end
    ? new Date(project.deadline.end).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Flexible / Not specified';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="project-modal-card page-enter"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="proj-modal-header">
          <div className="proj-modal-header-left">
            <div
              className="proj-modal-category-badge"
              style={{
                background: `${getCategoryColor(project.category)}15`,
                color: getCategoryColor(project.category),
              }}
            >
              <Briefcase size={13} />
              <span>{project.category || 'Development'}</span>
            </div>
            <span className="proj-modal-level-badge">{project.level || 'Beginner'}</span>
            <span className={`proj-modal-status-badge ${project.status || 'open'}`}>
              {project.status === 'closed' ? 'Closed' : 'Open for Contributors'}
            </span>
          </div>

          <button className="proj-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="proj-modal-body">
          {/* Title & Description */}
          <div className="proj-modal-main-info">
            <h2 className="proj-modal-title">{project.title || 'Untitled Project'}</h2>
            <p className="proj-modal-description">{project.description || 'No description provided.'}</p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="proj-modal-metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">
                <Users size={16} />
              </div>
              <div>
                <span className="metric-label">Team Capacity</span>
                <span className="metric-value">
                  {seatsFilled} / {membersRequired} Seats
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <IndianRupee size={16} />
              </div>
              <div>
                <span className="metric-label">Project Budget</span>
                <span className="metric-value">
                  Rs. {project.budget?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <Calendar size={16} />
              </div>
              <div>
                <span className="metric-label">Target Deadline</span>
                <span className="metric-value">{formattedDeadline}</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <Clock size={16} />
              </div>
              <div>
                <span className="metric-label">Experience Level</span>
                <span className="metric-value" style={{ textTransform: 'capitalize' }}>
                  {project.level || 'All levels'}
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Details Section */}
          <div className="proj-modal-split-grid">
            {/* Left Column: Creator & Members */}
            <div className="proj-modal-column">
              {/* Creator Card */}
              <div className="proj-modal-section">
                <h4 className="section-heading">Project Creator</h4>
                <div className="creator-profile-card">
                  <div className="creator-avatar">
                    {creator.profilePicture ? (
                      <img src={creator.profilePicture} alt={creator.name || 'Creator'} />
                    ) : (
                      <span>{creator.name?.[0]?.toUpperCase() || 'C'}</span>
                    )}
                  </div>
                  <div className="creator-info">
                    <span className="creator-name">{creator.name || 'Anonymous User'}</span>
                    {creator.tagline && <p className="creator-tagline">{creator.tagline}</p>}
                    <span className="creator-badge">Project Owner</span>
                  </div>
                </div>
              </div>

              {/* Current Team Members */}
              <div className="proj-modal-section">
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <h4 className="section-heading" style={{ margin: 0 }}>
                    Current Team Members ({members.length})
                  </h4>
                  <span className="capacity-note">
                    {membersRequired - members.length > 0
                      ? `${membersRequired - members.length} open position(s)`
                      : 'Team is full'}
                  </span>
                </div>

                {members.length === 0 ? (
                  <p className="empty-text">No approved team members yet.</p>
                ) : (
                  <div className="team-members-list">
                    {members.map((m, idx) => {
                      const mName = m.name || (typeof m === 'string' ? 'Member' : 'Contributor');
                      const isOwner = (m._id || m).toString() === creatorId?.toString();
                      return (
                        <div key={m._id || idx} className="team-member-item">
                          <div className="member-avatar-sm">
                            {m.profilePicture ? (
                              <img src={m.profilePicture} alt={mName} />
                            ) : (
                              <span>{mName[0]?.toUpperCase() || '?'}</span>
                            )}
                          </div>
                          <span className="team-member-name">{mName}</span>
                          {isOwner ? (
                            <span className="owner-chip">Owner</span>
                          ) : (
                            <span className="member-chip">Contributor</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Requirements, Links & GitHub */}
            <div className="proj-modal-column">
              {/* Skill Requirements */}
              <div className="proj-modal-section">
                <h4 className="section-heading">Required Skills</h4>
                {skills.length === 0 ? (
                  <p className="empty-text">Open to all skill levels.</p>
                ) : (
                  <div className="modal-skill-chips">
                    {skills.map((s, idx) => (
                      <span key={idx} className="modal-skill-tag">
                        <Check size={12} /> {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Repository & Attachments */}
              {(project.githubRepo || project.designFile) && (
                <div className="proj-modal-section">
                  <h4 className="section-heading">Project Resources</h4>
                  <div className="resource-links-list">
                    {project.githubRepo && (
                      <a
                        href={project.githubRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link-btn"
                      >
                        <GitBranch size={14} />
                        <span>{project.githubRepo.replace('https://', '')}</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {project.designFile && (
                      <a
                        href={project.designFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link-btn"
                      >
                        <FileText size={14} />
                        <span>View Attached Specification / Design</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action / Application Form Bar */}
          <div className="proj-modal-action-bar">
            {isCreator ? (
              <div className="creator-action-box">
                <span className="creator-note">
                  You created this project. Manage incoming applications or coordinate in team chat.
                </span>
                <div className="flex-center gap-10">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onClose();
                      navigate(`/projects/${project._id}/applications`);
                    }}
                  >
                    <UserCheck size={14} /> Review Applications
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      onClose();
                      navigate(`/chat/${project._id}`);
                    }}
                  >
                    <MessageSquare size={14} /> Team Chat Space
                  </button>
                </div>
              </div>
            ) : isMember ? (
              <div className="creator-action-box">
                <span className="creator-note" style={{ color: '#2E7D32' }}>
                  You are an approved member of this project team.
                </span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    navigate(`/chat/${project._id}`);
                  }}
                >
                  <MessageSquare size={14} /> Open Team Chat Space <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <form className="apply-form" onSubmit={handleApply}>
                <div className="apply-input-wrapper">
                  <input
                    type="text"
                    className="apply-message-input"
                    placeholder="Why are you a good fit? Mention relevant skills, experience or portfolio..."
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-primary apply-submit-btn"
                    disabled={applying}
                  >
                    <Send size={14} />
                    {applying ? 'Submitting...' : 'Apply to Join Project'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;
