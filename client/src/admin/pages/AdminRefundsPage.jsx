import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Search,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import { getAdminTransactions, processAdminRefund } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminRefundsPage = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [txnIdInput, setTxnIdInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  useEffect(() => {
    fetchRefunds();
  }, [page, search]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await getAdminTransactions({
        page,
        limit: 15,
        search,
        type: 'refund',
      });
      setRefunds(res.data.transactions);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueRefund = async (e) => {
    e.preventDefault();
    try {
      await processAdminRefund({
        transactionId: txnIdInput,
        reason: reasonInput,
      });
      toast.success('Refund processed successfully');
      setModalOpen(false);
      setTxnIdInput('');
      setReasonInput('');
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue refund');
    }
  };

  const columns = [
    {
      title: 'Refund ID / Details',
      key: 'transactionId',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <strong style={{ fontSize: '13.5px', color: '#111827' }}>{row.transactionId}</strong>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            {row.notes || 'Administrative settlement refund'}
          </span>
        </div>
      ),
    },
    {
      title: 'Refunded Amount',
      key: 'amount',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#DC2626', fontSize: '14px' }}>
          -₹{(row.amount || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Parties',
      key: 'parties',
      render: (row) => (
        <div style={{ fontSize: '12.5px', color: '#4B5563' }}>
          <div>Returned to: <strong>{row.payee?.name || 'Client'}</strong></div>
          <div>From: <strong>{row.payer?.name || 'Student / Platform'}</strong></div>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: 'Processed Date',
      key: 'createdAt',
      render: (row) => (
        <span className="table-date">
          {new Date(row.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ];

  const actionButton = (
    <button className="admin-btn-primary" onClick={() => setModalOpen(true)}>
      <RotateCcw size={16} /> Process Manual Refund
    </button>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Refunds & Disputed Transactions</h1>
          <p className="admin-page-subtitle">
            Audit reversed payments, arbitrated dispute outcomes, and financial compensations.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={refunds}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by Refund or original Transaction ID..."
        actionButton={actionButton}
      />

      {/* Manual Refund Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Process Transaction Refund"
        subtitle="Reverse a completed marketplace payment"
      >
        <form onSubmit={handleIssueRefund}>
          <div className="modal-form-group">
            <label className="form-label">Original Transaction ID</label>
            <input
              type="text"
              required
              value={txnIdInput}
              onChange={(e) => setTxnIdInput(e.target.value)}
              placeholder="e.g. TXN-1712399-4481"
              className="form-select-control"
            />
          </div>

          <div className="modal-form-group">
            <label className="form-label">Dispute Resolution / Refund Justification</label>
            <textarea
              required
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Provide reason for reversing the payment..."
              className="admin-notes-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="admin-btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-btn-primary">
              Issue Refund
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};

export default AdminRefundsPage;
