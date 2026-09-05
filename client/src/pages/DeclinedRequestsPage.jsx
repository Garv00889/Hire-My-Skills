import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, UserX, UserCheck, Eye, ArrowLeft,
  Mail, MapPin, Sparkles, Layers, ShieldAlert, CheckCircle2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import UserProfileModal from '../components/UserProfileModal';
import { getDeclinedApplications, updateApplicationStatus } from '../services/api';
import toast from 'react-hot-toast';
import './DeclinedRequestsPage.css';

// Inline brand icon
const GithubIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const DeclinedRequestsPage = () => {
  const navigate = useNavigate();
  const [declinedApps, setDeclinedApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    fetchDeclinedRequests();
  }, []);

  const fetchDeclinedRequests = async () => {
    try {
      setLoading(true);
      const { data } = await getDeclinedApplications();
      setDeclinedApps(data || []);
    } catch (err) {
      toast.error('Failed to load declined requests');
      setDeclinedApps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReevaluate = async (appId) => {
    setActionLoading(appId);
    try {
      await updateApplicationStatus(appId, 'approved');
      setDeclinedApps(prev => prev.filter(a => a._id !== appId));
      toast.success('Candidate shortlisted and moved to active project team.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update application');
    } finally {
      setActionLoading('');
    }
  };

  const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return '7 days';
    const diffMs = new Date(expiresAt) - new Date();
    if (diffMs <= 0) return 'Expired';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours}h left`;
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  };

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="declined-page-wrapper">
      <Navbar />

      <main className="declined-container page-enter">
        {/* Header */}
        <div className="declined-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex-between">
            <div>
              <div className="declined-badge-pill">
                <Clock size={13} color="#C62828" /> 7-Day Temporary Retention Section
              </div>
              <h1 className="declined-title">Declined Requests</h1>
              <p className="declined-subtitle">
                Review candidates you recently declined. Applications are safely retained for <strong>7 days</strong> before auto-purging.
              </p>
            </div>
            <span className="declined-count-chip">{declinedApps.length} Requests</span>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="loading-center">
            <div className="spinner-gold" />
            <p>Loading declined requests...</p>
          </div>
        ) : declinedApps.length === 0 ? (
          <div className="empty-declined-state">
            <div className="empty-icon-box">
              <UserX size={36} color="var(--gold)" />
            </div>
            <h3>No Temporarily Declined Requests</h3>
            <p>When you decline candidate applications, they will appear here for 7 days before being automatically purged.</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/notifications')}>
              View Notifications
            </button>
          </div>
        ) : (
          <div className="declined-grid">
            {declinedApps.map(app => {
              const daysLeft = getDaysRemaining(app.expiresAt);
              return (
                <div key={app._id} className="declined-card">
                  {/* Retention Banner */}
                  <div className="retention-header flex-between">
                    <span className="retention-timer-badge">
                      <Clock size={12} /> {daysLeft}
                    </span>
                    <span className="declined-date-label">
                      Declined {new Date(app.declinedAt || app.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Candidate Info */}
                  <div className="declined-cand-info flex-between">
                    <div className="cand-left-group">
                      <div className="cand-avatar-lg">
                        {app.applicant?.profilePicture
                          ? <img src={app.applicant.profilePicture} alt="" />
                          : getInitials(app.applicant?.name)
                        }
                      </div>
                      <div>
                        <h3 className="cand-name-title">{app.applicant?.name || 'Unknown Candidate'}</h3>
                        <p className="cand-tagline-sub">{app.applicant?.tagline || 'Applicant'}</p>
                        <p className="proj-title-pill">
                          <Layers size={11} /> Project: {app.project?.title || 'Unknown Project'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Application Note */}
                  {app.message && (
                    <p className="cand-msg-preview">"{app.message}"</p>
                  )}

                  {/* Candidate Skills */}
                  {app.applicant?.skills?.length > 0 && (
                    <div className="declined-skills-list">
                      {app.applicant.skills.slice(0, 4).map((s, i) => (
                        <span key={i} className="skill-mini-chip">{s}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="declined-card-actions flex-between">
                    <button
                      className="btn-secondary view-prof-btn"
                      onClick={() => setSelectedProfileId(app.applicant?._id)}
                    >
                      <Eye size={14} /> View Portfolio
                    </button>
                    <button
                      className="btn-primary reevaluate-btn"
                      disabled={actionLoading === app._id}
                      onClick={() => handleReevaluate(app._id)}
                    >
                      <UserCheck size={14} />
                      {actionLoading === app._id ? 'Shortlisting...' : 'Re-evaluate & Shortlist'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Full Profile Modal */}
      {selectedProfileId && (
        <UserProfileModal
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
    </div>
  );
};

export default DeclinedRequestsPage;
