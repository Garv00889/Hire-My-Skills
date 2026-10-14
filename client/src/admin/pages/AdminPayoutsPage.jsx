import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import { getAdminPayouts, updateAdminPayoutStatus } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminPayoutsPage = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pendingSummary, setPendingSummary] = useState({ total: 0, count: 0 });

  // Modal
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState('completed'); // 'completed' or 'rejected'
  const [transactionRef, setTransactionRef] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, [page, selectedStatus]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await getAdminPayouts({
        page,
        limit: 15,
        status: selectedStatus,
      });
      setPayouts(res.data.payouts);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
      setPendingSummary(res.data.pendingSummary);
    } catch (err) {
      toast.error('Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (payout, type) => {
    setSelectedPayout(payout);
    setActionType(type);
    setTransactionRef(`UTR-${Date.now().toString().slice(-8)}`);
    setRejectionReason('');
    setAdminNotes('');
    setActionModalOpen(true);
  };

  const handleSaveAction = async () => {
    try {
      await updateAdminPayoutStatus(selectedPayout._id, {
        status: actionType,
        transactionRef: actionType === 'completed' ? transactionRef : '',
        rejectionReason: actionType === 'rejected' ? rejectionReason : '',
        adminNotes,
      });
      toast.success(`Payout marked as ${actionType}`);
      setActionModalOpen(false);
      fetchPayouts();
    } catch (err) {
      toast.error('Failed to update payout status');
    }
  };

  const columns = [
    {
      title: 'Payout ID / Student',
      key: 'payoutId',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <strong style={{ fontSize: '13.5px', color: '#111827' }}>{row.payoutId}</strong>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            {row.user?.name} ({row.user?.email})
          </span>
        </div>
      ),
    },
    {
      title: 'Withdrawal Amount',
      key: 'amount',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>
          ₹{(row.amount || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Payment Method & Details',
      key: 'method',
      render: (row) => (
        <div style={{ fontSize: '12.5px', color: '#374151' }}>
          <span style={{ fontWeight: 600, textTransform: 'uppercase', color: '#D4891A' }}>
            {row.paymentMethod}
          </span>
          {row.paymentMethod === 'upi' && (
            <div style={{ color: '#6B7280' }}>UPI: {row.paymentDetails?.upiId || 'N/A'}</div>
          )}
          {row.paymentMethod === 'bank_transfer' && (
            <div style={{ color: '#6B7280' }}>
              A/C: {row.paymentDetails?.accountNumber} ({row.paymentDetails?.ifscCode})
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: 'Requested',
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
        row.status === 'pending' ? (
          <div className="table-actions-strip">
            <button
              className="action-icon-btn"
              style={{ color: '#059669', borderColor: '#10B981' }}
              title="Approve & Complete Payout"
              onClick={() => handleOpenAction(row, 'completed')}
            >
              <CheckCircle size={16} />
            </button>
            <button
              className="action-icon-btn danger"
              title="Reject Payout Request"
              onClick={() => handleOpenAction(row, 'rejected')}
            >
              <XCircle size={16} />
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
            {row.transactionRef || 'Processed'}
          </span>
        )
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
      <option value="completed">Completed</option>
      <option value="processing">Processing</option>
      <option value="rejected">Rejected</option>
    </select>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Student Payout Requests</h1>
          <p className="admin-page-subtitle">
            Review earnings withdrawal requests to UPI handles and Indian bank accounts. Verify deliverables prior to settlement.
          </p>
        </div>
      </div>

      {/* Pending Summary Box */}
      {pendingSummary.count > 0 && (
        <div style={{
          background: 'rgba(245, 166, 35, 0.1)',
          border: '1px solid rgba(245, 166, 35, 0.3)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <div>
            <strong style={{ fontSize: '15px', color: '#B45309' }}>
              {pendingSummary.count} Pending Withdrawal Requests Awaiting Approval
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#78350F' }}>
              Total pending disbursement: <strong>₹{(pendingSummary.total || 0).toLocaleString('en-IN')}</strong>
            </p>
          </div>
        </div>
      )}

      <AdminTable
        columns={columns}
        data={payouts}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        filterComponent={filterComponent}
      />

      {/* Action Dialog */}
      <AdminModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={actionType === 'completed' ? 'Approve & Settle Payout' : 'Reject Withdrawal Request'}
        subtitle={`Request ID: ${selectedPayout?.payoutId} · Student: ${selectedPayout?.user?.name} · ₹${selectedPayout?.amount}`}
        footer={
          <>
            <button className="admin-btn-secondary" onClick={() => setActionModalOpen(false)}>
              Cancel
            </button>
            <button
              className={actionType === 'completed' ? 'admin-btn-primary' : 'admin-btn-primary danger'}
              onClick={handleSaveAction}
            >
              {actionType === 'completed' ? 'Confirm Settlement' : 'Confirm Rejection'}
            </button>
          </>
        }
      >
        {actionType === 'completed' ? (
          <div>
            <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#4B5563', lineHeight: '1.5' }}>
              Confirming this payout will automatically disburse <strong>₹{selectedPayout?.amount}</strong> from the student's wallet balance and generate a completed payout transaction record.
            </p>

            <div className="modal-form-group">
              <label className="form-label">Bank UTR / UPI Transaction Reference</label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UTR-99214488"
                className="form-select-control"
              />
            </div>

            <div className="modal-form-group">
              <label className="form-label">Internal Settlement Notes</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Processed via HDFC Corporate Netbanking..."
                className="admin-notes-textarea"
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="modal-form-group">
              <label className="form-label">Reason for Rejection</label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid UPI handle, minimum KYC requirements not met..."
                className="admin-notes-textarea"
              />
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default AdminPayoutsPage;
