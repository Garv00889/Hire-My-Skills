import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Bell,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import {
  getAdminAnnouncements,
  createAdminAnnouncement,
  updateAdminAnnouncement,
  deleteAdminAnnouncement,
} from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    priority: 'info',
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await getAdminAnnouncements();
      setAnnouncements(res.data);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createAdminAnnouncement(formData);
      toast.success('Announcement broadcasted!');
      setModalOpen(false);
      setFormData({ title: '', message: '', targetAudience: 'all', priority: 'info' });
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create announcement');
    }
  };

  const handleToggleActive = async (ann) => {
    try {
      await updateAdminAnnouncement(ann._id, { isActive: !ann.isActive });
      toast.success(`Announcement ${!ann.isActive ? 'activated' : 'paused'}`);
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (ann) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteAdminAnnouncement(ann._id);
      toast.success('Announcement removed');
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to delete announcement');
    }
  };

  const columns = [
    {
      title: 'Title & Message',
      key: 'title',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <strong style={{ fontSize: '13.5px', color: '#111827' }}>{row.title}</strong>
          <span style={{ fontSize: '12.5px', color: '#4B5563', maxWidth: '420px' }}>
            {row.message}
          </span>
        </div>
      ),
    },
    {
      title: 'Target Audience',
      key: 'targetAudience',
      render: (row) => (
        <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '12.5px', color: '#1F2937' }}>
          {row.targetAudience}
        </span>
      ),
    },
    {
      title: 'Priority',
      key: 'priority',
      render: (row) => <StatusBadge status={row.priority} />,
    },
    {
      title: 'Status',
      key: 'isActive',
      render: (row) => <StatusBadge status={row.isActive ? 'active' : 'closed'} text={row.isActive ? 'Live' : 'Inactive'} />,
    },
    {
      title: 'Created Date',
      key: 'createdAt',
      render: (row) => (
        <span className="table-date">
          {new Date(row.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions-strip">
          <button
            className="action-icon-btn"
            title={row.isActive ? 'Pause Broadcast' : 'Activate Broadcast'}
            onClick={() => handleToggleActive(row)}
          >
            {row.isActive ? <ToggleRight size={18} color="#059669" /> : <ToggleLeft size={18} color="#9CA3AF" />}
          </button>
          <button
            className="action-icon-btn danger"
            title="Delete"
            onClick={() => handleDelete(row)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const actionButton = (
    <button className="admin-btn-primary" onClick={() => setModalOpen(true)}>
      <Plus size={16} /> Broadcast New Alert
    </button>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Platform Announcements & Alerts</h1>
          <p className="admin-page-subtitle">
            Broadcast platform updates, maintenance notices, and promotional notifications to students, clients, or all users.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={announcements}
        loading={loading}
        actionButton={actionButton}
      />

      {/* Broadcast Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Broadcast Platform Announcement"
        subtitle="Push an alert banner across the student & client marketplace"
      >
        <form onSubmit={handleCreate}>
          <div className="modal-form-group">
            <label className="form-label">Announcement Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Scheduled Maintenance or New Feature Launch"
              className="form-select-control"
            />
          </div>

          <div className="modal-form-group">
            <label className="form-label">Message Content</label>
            <textarea
              required
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Detailed message displayed on user dashboards..."
              className="admin-notes-textarea"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="modal-form-group">
              <label className="form-label">Target Audience</label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="form-select-control"
              >
                <option value="all">Everyone (Students + Clients)</option>
                <option value="students">Students Only</option>
                <option value="clients">Clients Only</option>
              </select>
            </div>

            <div className="modal-form-group">
              <label className="form-label">Severity Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="form-select-control"
              >
                <option value="info">Informational (Blue)</option>
                <option value="warning">Warning / Notice (Amber)</option>
                <option value="urgent">Urgent / Critical (Red)</option>
                <option value="success">Success / Promotion (Green)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="admin-btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-btn-primary">
              Send Broadcast
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};

export default AdminAnnouncementsPage;
