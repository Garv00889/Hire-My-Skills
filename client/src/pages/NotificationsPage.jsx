import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageSquare, UserCheck, UserX,
  CheckCircle2, Clock, Sparkles, ArrowRight, Check,
  Sliders, Eye, Layers, Trash2, RefreshCw, BellOff
} from 'lucide-react';
import Navbar from '../components/Navbar';
import UserProfileModal from '../components/UserProfileModal';
import { useNotifications } from '../context/NotificationContext';
import { deleteNotification, updateApplicationStatus, getDeclinedApplications } from '../services/api';
import toast from 'react-hot-toast';
import './NotificationsPage.css';

// Relative-time updater to keep "5m ago" ticking while the page is open
const useRelativeTime = (createdAt) => {
  const fmt = (d) => {
    const diffMs = Date.now() - new Date(d);
    const s = Math.floor(diffMs / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const day = Math.floor(h / 24);
    if (s < 60) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (day < 7) return `${day}d ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  const [label, setLabel] = useState(() => fmt(createdAt));
  useEffect(() => {
    const interval = setInterval(() => setLabel(fmt(createdAt)), 60000);
    return () => clearInterval(interval);
  }, [createdAt]);
  return label;
};

// Single notification card
const NotifCard = ({ item, onMarkRead, onDelete, onAction, onAccept, onDecline }) => {
  const timeLabel = useRelativeTime(item.createdAt);

  const typeColors = {
    applications: { bg: 'rgba(76,175,80,0.1)', color: '#2E7D32', dot: '#4CAF50' },
    chat: { bg: 'rgba(245,166,35,0.1)', color: '#b37600', dot: '#F5A623' },
    system: { bg: 'rgba(156,39,176,0.1)', color: '#6A1B9A', dot: '#9C27B0' },
  };
  const style = typeColors[item.category] || typeColors.system;

  return (
    <div
      className={`notif-card ${!item.read ? 'notif-card--unread' : ''}`}
      onClick={() => !item.read && onMarkRead(item.id)}
    >
      {/* Unread indicator strip */}
      {!item.read && <span className="notif-unread-strip" style={{ background: style.dot }} />}

      <div className="notif-card-body">
        {/* Avatar */}
        <div className="notif-avatar" style={{ background: style.bg, color: style.color }}>
          {item.senderPicture
            ? <img src={item.senderPicture} alt={item.user} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : item.avatar
          }
        </div>

        {/* Content */}
        <div className="notif-card-content">
          <div className="notif-card-header">
            <div>
              <span className="notif-card-name">{item.user}</span>
              <span className="notif-card-type" style={{ background: style.bg, color: style.color }}>
                {item.title}
              </span>
            </div>
            <div className="notif-card-meta">
              <span className="notif-card-time">
                <Clock size={11} /> {timeLabel}
              </span>
              {!item.read && <span className="notif-blue-dot" />}
            </div>
          </div>

          <p className="notif-card-msg">{item.message}</p>

          <div className="notif-card-actions">
            <div className="notif-card-actions-left">
              {/* Primary CTA: Review / Open Chat */}
              <button
                type="button"
                className="notif-action-btn notif-action-primary"
                onClick={(e) => { e.stopPropagation(); onAction(item); }}
              >
                {item.actionText} <ArrowRight size={13} />
              </button>

              {/* Accept Application — for project creators receiving applications */}
              {item.actionType === 'application' && item.relatedApplication && (
                <button
                  type="button"
                  className="notif-action-btn notif-action-accept"
                  onClick={(e) => { e.stopPropagation(); onAccept(item); }}
                  title="Accept candidate and add to project team chat"
                >
                  <UserCheck size={13} /> Accept Application
                </button>
              )}

              {/* Decline — for project creators receiving applications */}
              {item.actionType === 'application' && item.relatedApplication && (
                <button
                  type="button"
                  className="notif-action-btn notif-action-decline"
                  onClick={(e) => { e.stopPropagation(); onDecline(item); }}
                  title="Decline candidate (7-day retention)"
                >
                  <UserX size={13} /> Decline
                </button>
              )}
            </div>

            <div className="notif-card-actions-right">
              {!item.read && (
                <button
                  type="button"
                  className="notif-icon-btn"
                  title="Mark as read"
                  onClick={(e) => { e.stopPropagation(); onMarkRead(item.id); }}
                >
                  <Check size={14} />
                </button>
              )}
              <button
                type="button"
                className="notif-icon-btn notif-icon-delete"
                title="Delete notification"
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markBatchRead,
    markAllRead,
    removeNotification,
  } = useNotifications();

  const [declinedList, setDeclinedList] = useState([]);
  const [declinedLoading, setDeclinedLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Load declined applications
  const fetchDeclined = useCallback(async () => {
    try {
      setDeclinedLoading(true);
      const res = await getDeclinedApplications();
      setDeclinedList(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDeclinedList([]);
    } finally {
      setDeclinedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeclined();
  }, [fetchDeclined]);

  // Auto-mark all visible unread notifications as read after 3 seconds on the page
  useEffect(() => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    const timer = setTimeout(() => {
      markBatchRead(unreadIds);
    }, 3000);
    return () => clearTimeout(timer);
  }, [notifications.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    await fetchDeclined();
    setRefreshing(false);
    toast.success('Notifications refreshed');
  };

  const handleMarkRead = (id) => {
    markRead(id);
  };

  const handleDelete = async (id) => {
    removeNotification(id);
    try {
      await deleteNotification(id);
    } catch {
      // Silently ignore
    }
  };

  const handleAccept = async (item) => {
    if (!item.relatedApplication) {
      toast.error('Application reference not found');
      return;
    }
    try {
      await updateApplicationStatus(item.relatedApplication, 'approved');
      markRead(item.id);
      toast.success('Application accepted. Candidate added to project team and granted chat access.');
      fetchNotifications();
      fetchDeclined();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept application');
    }
  };

  const handleDecline = async (item) => {
    if (!item.relatedApplication) {
      toast.error('Application reference not found');
      return;
    }
    try {
      await updateApplicationStatus(item.relatedApplication, 'temporarily_declined');
      removeNotification(item.id);
      toast.success('Application moved to Temporarily Declined (7-day retention)');
      fetchDeclined();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline application');
    }
  };

  const handleAction = (item) => {
    markRead(item.id);
    if (item.actionType === 'chat') return navigate(`/chat/${item.projectId}`);
    if (item.actionType === 'application') return navigate(`/projects/${item.projectId}/applications`);
    navigate('/explore');
  };

  const handleReevaluate = async (appId) => {
    try {
      await updateApplicationStatus(appId, 'approved');
      setDeclinedList(prev => prev.filter(a => a._id !== appId));
      toast.success('Candidate shortlisted and added to project team.');
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to shortlist');
    }
  };

  const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return '7 days';
    const diffMs = new Date(expiresAt) - Date.now();
    if (diffMs <= 0) return 'Expired';
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
  };

  // Filtered list
  const filteredItems = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'applications') return n.category === 'applications';
    if (filter === 'chat') return n.category === 'chat';
    if (filter === 'system') return n.category === 'system';
    if (filter === 'declined') return false;
    return true;
  });

  const appCount = notifications.filter(n => n.category === 'applications').length;
  const chatCount = notifications.filter(n => n.category === 'chat').length;
  const unreadAppCount = notifications.filter(n => n.category === 'applications' && !n.read).length;
  const unreadChatCount = notifications.filter(n => n.category === 'chat' && !n.read).length;

  return (
    <div className="notif-page-wrapper">
      <Navbar />

      <main className="notif-container page-enter">
        {/* Header */}
        <div className="notif-header flex-between">
          <div>
            <div className="notif-badge-pill">
              {unreadCount > 0 && <span className="pulse-dot" />}
              Notification Center
            </div>
            <h1 className="notif-title">
              Notifications
              {unreadCount > 0 && (
                <span className="notif-count-chip">{unreadCount} unread</span>
              )}
            </h1>
            <p className="notif-subtitle">
              Stay updated on your project applications, team messages, and platform activity.
            </p>
          </div>

          <div className="notif-header-actions">
            <button
              type="button"
              className="btn-secondary notif-refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh notifications"
            >
              <RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {unreadCount > 0 && (
              <button type="button" className="btn-secondary notif-read-all-btn" onClick={markAllRead}>
                <CheckCircle2 size={15} /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="notif-layout-grid">

          {/* Sidebar Filters */}
          <aside className="notif-sidebar">
            <div className="notif-filter-card">
              <h3 className="sidebar-card-title flex-between">
                <span>Filter</span>
                <Sliders size={14} color="var(--text-muted)" />
              </h3>

              <div className="vertical-filter-list">
                <button
                  type="button"
                  className={`v-filter-item ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  <span className="flex-center gap-8"><Bell size={14} /> All</span>
                  <div className="v-filter-badges">
                    <span className="v-filter-badge">{notifications.length}</span>
                    {unreadCount > 0 && <span className="v-filter-badge gold">{unreadCount}</span>}
                  </div>
                </button>

                <button
                  type="button"
                  className={`v-filter-item ${filter === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilter('unread')}
                >
                  <span className="flex-center gap-8"><Sparkles size={14} /> Unread Only</span>
                  <span className="v-filter-badge gold">{unreadCount}</span>
                </button>

                <button
                  type="button"
                  className={`v-filter-item ${filter === 'applications' ? 'active' : ''}`}
                  onClick={() => setFilter('applications')}
                >
                  <span className="flex-center gap-8"><UserCheck size={14} /> Applications</span>
                  <div className="v-filter-badges">
                    <span className="v-filter-badge">{appCount}</span>
                    {unreadAppCount > 0 && <span className="v-filter-badge gold">{unreadAppCount}</span>}
                  </div>
                </button>

                <button
                  type="button"
                  className={`v-filter-item ${filter === 'chat' ? 'active' : ''}`}
                  onClick={() => setFilter('chat')}
                >
                  <span className="flex-center gap-8"><MessageSquare size={14} /> Chat</span>
                  <div className="v-filter-badges">
                    <span className="v-filter-badge">{chatCount}</span>
                    {unreadChatCount > 0 && <span className="v-filter-badge gold">{unreadChatCount}</span>}
                  </div>
                </button>

                <button
                  type="button"
                  className={`v-filter-item ${filter === 'declined' ? 'active' : ''}`}
                  onClick={() => setFilter('declined')}
                >
                  <span className="flex-center gap-8"><UserX size={14} color="#C62828" /> Declined</span>
                  <span className="v-filter-badge red">{declinedList.length}</span>
                </button>
              </div>
            </div>

            {/* Declined hub quick link */}
            <div className="notif-filter-card" style={{ marginTop: 14 }}>
              <h3 className="sidebar-card-title" style={{ marginBottom: 8 }}>
                <Clock size={14} color="var(--text-muted)" /> Declined Hub
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                Declined candidates are retained for 7 days before automatic cleanup.
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', fontSize: 12, padding: '7px 12px', justifyContent: 'center' }}
                onClick={() => navigate('/declined-requests')}
              >
                Open Full Hub <ArrowRight size={13} />
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <section className="notif-main-content">

            {/* ─── DECLINED VIEW ─── */}
            {filter === 'declined' ? (
              <div className="declined-inpage-section page-enter">
                <div className="flex-between" style={{ marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Temporarily Declined Requests</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Retained for <strong>7 days</strong> — you can re-evaluate anytime.
                    </p>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => navigate('/declined-requests')}>
                    Full Hub <ArrowRight size={14} />
                  </button>
                </div>

                {declinedLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <div className="spinner-gold" style={{ margin: '0 auto' }} />
                  </div>
                ) : declinedList.length === 0 ? (
                  <div className="empty-notif-state">
                    <div className="empty-icon"><UserX size={32} color="var(--gold)" /></div>
                    <h3>No Declined Applications</h3>
                    <p>Applications you decline will be stored here temporarily with re-evaluation options.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {declinedList.map(app => {
                      const daysLeft = getDaysRemaining(app.expiresAt);
                      return (
                        <div key={app._id} className="notif-card" style={{ cursor: 'default' }}>
                          <div className="notif-card-body">
                            <div className="notif-avatar" style={{ background: 'rgba(244,67,54,0.1)', color: '#C62828' }}>
                              {app.applicant?.name?.[0] || '?'}
                            </div>
                            <div className="notif-card-content">
                              <div className="notif-card-header">
                                <div>
                                  <span className="notif-card-name">{app.applicant?.name}</span>
                                  <span className="notif-card-type" style={{ background: 'rgba(244,67,54,0.1)', color: '#C62828' }}>
                                    Temporarily Declined
                                  </span>
                                </div>
                                <span className="notif-card-time">
                                  <Clock size={11} /> {daysLeft} · Project: {app.project?.title}
                                </span>
                              </div>
                              {app.message && (
                                <p className="notif-card-msg">"{app.message}"</p>
                              )}
                              <div className="notif-card-actions">
                                <div className="notif-card-actions-left">
                                  <button
                                    type="button"
                                    className="notif-action-btn notif-action-ghost"
                                    onClick={() => setSelectedProfileId(app.applicant?._id)}
                                  >
                                    <Eye size={13} /> View Portfolio
                                  </button>
                                  <button
                                    type="button"
                                    className="notif-action-btn notif-action-primary"
                                    onClick={() => handleReevaluate(app._id)}
                                  >
                                    <UserCheck size={13} /> Re-evaluate & Shortlist
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            ) : (
              /* ─── NORMAL NOTIFICATION LIST ─── */
              <>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="notif-card notif-card-skeleton">
                        <div className="skeleton-avatar" />
                        <div className="notif-card-content">
                          <div className="skeleton-line" style={{ width: '60%', height: 14 }} />
                          <div className="skeleton-line" style={{ width: '90%', height: 12, marginTop: 8 }} />
                          <div className="skeleton-line" style={{ width: '40%', height: 12, marginTop: 6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="empty-notif-state">
                    <div className="empty-icon"><BellOff size={36} color="var(--gold)" /></div>
                    <h3>
                      {filter === 'unread' ? 'All caught up' : 'No Notifications Yet'}
                    </h3>
                    <p>
                      {filter === 'unread'
                        ? 'You have no unread notifications. Great job staying on top of things.'
                        : 'When someone applies to your project, sends a message, or updates your application status, it will appear here.'}
                    </p>
                    <div className="empty-actions flex-center gap-8" style={{ marginTop: 20 }}>
                      <button type="button" className="btn-primary" onClick={() => navigate('/explore')}>
                        Explore Projects <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="notif-cards-list">
                    {/* Unread section header */}
                    {filteredItems.some(n => !n.read) && (
                      <div className="notif-section-label">
                        <span className="notif-section-dot unread-dot" />
                        New &amp; Unread
                        <button
                          type="button"
                          className="notif-inline-mark-all"
                          onClick={markAllRead}
                          title="Mark all as read"
                        >
                          <CheckCircle2 size={13} /> Mark all read
                        </button>
                      </div>
                    )}

                    {/* Unread notifications first */}
                    {filteredItems
                      .filter(n => !n.read)
                      .map(item => (
                        <NotifCard
                          key={item.id}
                          item={item}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                          onAction={handleAction}
                          onAccept={handleAccept}
                          onDecline={handleDecline}
                        />
                      ))
                    }

                    {/* Read section header */}
                    {filteredItems.some(n => n.read) && filteredItems.some(n => !n.read) && (
                      <div className="notif-section-label" style={{ marginTop: 12 }}>
                        <span className="notif-section-dot read-dot" />
                        Earlier
                      </div>
                    )}

                    {/* Read notifications */}
                    {filteredItems
                      .filter(n => n.read)
                      .map(item => (
                        <NotifCard
                          key={item.id}
                          item={item}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                          onAction={handleAction}
                          onAccept={handleAccept}
                          onDecline={handleDecline}
                        />
                      ))
                    }
                  </div>
                )}
              </>
            )}
          </section>
        </div>
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

export default NotificationsPage;
