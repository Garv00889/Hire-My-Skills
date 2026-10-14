import React, { useState, useEffect } from 'react';
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import { getAdminProposals, updateAdminProposalStatus } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminProposalsPage = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('pending');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchProposals();
  }, [page, selectedStatus]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await getAdminProposals({
        page,
        limit: 15,
        status: selectedStatus,
      });
      setProposals(res.data.proposals);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (prop) => {
    setSelectedProposal(prop);
    setNewStatus(prop.status);
    setAdminNotes(prop.adminNotes || '');
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    try {
      await updateAdminProposalStatus(selectedProposal._id, {
        status: newStatus,
        adminNotes,
      });
      toast.success('Proposal status updated');
      setStatusModalOpen(false);
      fetchProposals();
    } catch (err) {
      toast.error('Failed to update proposal status');
    }
  };

  const columns = [
    {
      title: 'Applicant',
      key: 'applicant',
      render: (row) => (
        <div className="table-user-cell">
          <div className="table-user-avatar">
            {row.applicant?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="table-user-meta">
            <span className="table-user-name">{row.applicant?.name || 'Applicant'}</span>
            <span className="table-user-email">{row.applicant?.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Target Project',
      key: 'project',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: '13.5px', color: '#111827' }}>
            {row.project?.title || 'Unknown Project'}
          </strong>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Budget: ₹{(row.project?.budget || 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      title: 'Proposal Pitch',
      key: 'message',
      render: (row) => (
        <span style={{ fontSize: '13px', color: '#4B5563', maxWidth: '300px', display: 'inline-block' }}>
          {row.message ? (row.message.length > 70 ? `${row.message.slice(0, 70)}...` : row.message) : 'No message'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: 'Submitted',
      key: 'createdAt',
      render: (row) => (
        <span className="table-date">
          {new Date(row.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <button
          className="action-icon-btn"
          title="Review & Override Status"
          onClick={() => handleOpenStatusModal(row)}
        >
          <CheckCircle size={16} />
        </button>
      ),
    },
  ];

  const filterComponent = (
    <select
      value={selectedStatus}
      onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
      className="admin-select-filter"
    >
      <option value="all">All Statuses</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
      <option value="temporarily_declined">Declined (7-Day)</option>
    </select>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Proposals & Bids</h1>
          <p className="admin-page-subtitle">
            Track student application submissions, proposal pitches, and client acceptance rates across all live projects.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={proposals}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        filterComponent={filterComponent}
      />

      {/* Override Status Modal */}
      <AdminModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Proposal Status Override"
        subtitle={`Applicant: ${selectedProposal?.applicant?.name} · Project: ${selectedProposal?.project?.title}`}
        footer={
          <>
            <button className="admin-btn-secondary" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </button>
            <button className="admin-btn-primary" onClick={handleSaveStatus}>
              Save Status
            </button>
          </>
        }
      >
        <div style={{ marginBottom: '16px', background: '#F9FAFB', padding: '14px', borderRadius: '10px' }}>
          <strong style={{ fontSize: '13px', color: '#111827' }}>Proposal Pitch:</strong>
          <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#4B5563', lineHeight: '1.5' }}>
            {selectedProposal?.message || 'No pitch submitted'}
          </p>
        </div>

        <div className="modal-form-group">
          <label className="form-label">Update Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select-control"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="temporarily_declined">Temporarily Declined</option>
          </select>
        </div>

        <div className="modal-form-group">
          <label className="form-label">Admin Notes</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
            className="admin-notes-textarea"
            placeholder="Reason for override..."
          />
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminProposalsPage;
