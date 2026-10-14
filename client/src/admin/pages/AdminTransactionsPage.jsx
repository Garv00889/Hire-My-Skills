import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ShieldCheck,
  Search,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import { getAdminTransactions, createAdminTransaction, processAdminRefund } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [summary, setSummary] = useState({ totalAmount: 0, totalFees: 0, totalNet: 0 });

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [refundReason, setRefundReason] = useState('');

  const [formData, setFormData] = useState({
    type: 'project_payment',
    amount: 5000,
    payerEmail: '',
    payeeEmail: '',
    paymentGateway: 'upi',
    notes: 'Escrow payment release for milestone',
  });

  useEffect(() => {
    fetchTransactions();
  }, [page, search, selectedType, selectedStatus]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await getAdminTransactions({
        page,
        limit: 15,
        search,
        type: selectedType,
        status: selectedStatus,
      });
      setTransactions(res.data.transactions);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
      setSummary(res.data.summary);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTxn = async (e) => {
    e.preventDefault();
    try {
      await createAdminTransaction(formData);
      toast.success('Transaction recorded successfully');
      setCreateModalOpen(false);
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transaction');
    }
  };

  const handleOpenRefund = (txn) => {
    setSelectedTxn(txn);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async () => {
    try {
      await processAdminRefund({
        transactionId: selectedTxn.transactionId,
        reason: refundReason,
      });
      toast.success(`Refund of ₹${selectedTxn.amount} processed`);
      setRefundModalOpen(false);
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process refund');
    }
  };

  const columns = [
    {
      title: 'Transaction ID / Details',
      key: 'transactionId',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <strong style={{ fontSize: '13.5px', color: '#111827' }}>{row.transactionId}</strong>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            {row.notes || row.type.replace(/_/g, ' ')}
          </span>
        </div>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      render: (row) => <StatusBadge status={row.type} />,
    },
    {
      title: 'Gross Amount',
      key: 'amount',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>
          ₹{(row.amount || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Platform Fee (10%)',
      key: 'platformFee',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#059669', fontSize: '13px' }}>
          ₹{(row.platformFee || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Parties',
      key: 'parties',
      render: (row) => (
        <div style={{ fontSize: '12.5px', color: '#4B5563' }}>
          <div>From: <strong>{row.payer?.name || 'Platform/Client'}</strong></div>
          <div>To: <strong>{row.payee?.name || 'Platform/Student'}</strong></div>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: 'Date',
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
        row.status === 'completed' && row.type !== 'refund' && (
          <button
            className="action-icon-btn"
            title="Issue Refund"
            onClick={() => handleOpenRefund(row)}
          >
            <RotateCcw size={15} />
          </button>
        )
      ),
    },
  ];

  const filterComponent = (
    <div className="admin-filters-group">
      <select
        value={selectedType}
        onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Types</option>
        <option value="project_payment">Project Payment</option>
        <option value="ready_made_purchase">Ready-Made Purchase</option>
        <option value="escrow_deposit">Escrow Deposit</option>
        <option value="milestone_release">Milestone Release</option>
        <option value="payout">Payout</option>
        <option value="refund">Refund</option>
      </select>

      <select
        value={selectedStatus}
        onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Statuses</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="refunded">Refunded</option>
        <option value="failed">Failed</option>
      </select>
    </div>
  );

  const actionButton = (
    <button className="admin-btn-primary" onClick={() => setCreateModalOpen(true)}>
      <Plus size={16} /> Record Transaction
    </button>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Financial Transactions & Payments</h1>
          <p className="admin-page-subtitle">
            Centralized financial ledger tracking project escrow milestones, digital sales, platform fees, and refunds.
          </p>
        </div>
      </div>

      {/* Summary Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '8px' }}>
        <div style={{ background: '#FFF', border: '1px solid #E8E5DF', borderRadius: '14px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Filter Total Gross</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700, color: '#111827' }}>
            ₹{(summary.totalAmount || 0).toLocaleString('en-IN')}
          </h3>
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E8E5DF', borderRadius: '14px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Platform Commissions</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700, color: '#059669' }}>
            ₹{(summary.totalFees || 0).toLocaleString('en-IN')}
          </h3>
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E8E5DF', borderRadius: '14px', padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Net Disbursed</span>
          <h3 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700, color: '#D4891A' }}>
            ₹{(summary.totalNet || 0).toLocaleString('en-IN')}
          </h3>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={transactions}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by TXN ID, gateway reference..."
        filterComponent={filterComponent}
        actionButton={actionButton}
      />

      {/* Record Transaction Modal */}
      <AdminModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Record Manual Transaction"
        subtitle="Simulate or log a verified payment or escrow deposit"
      >
        <form onSubmit={handleCreateTxn}>
          <div className="modal-form-group">
            <label className="form-label">Transaction Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="form-select-control"
            >
              <option value="project_payment">Project Payment</option>
              <option value="ready_made_purchase">Ready-Made Purchase</option>
              <option value="escrow_deposit">Escrow Deposit</option>
              <option value="milestone_release">Milestone Release</option>
              <option value="wallet_deposit">Direct Wallet Deposit</option>
            </select>
          </div>

          <div className="modal-form-group">
            <label className="form-label">Amount (INR ₹)</label>
            <input
              type="number"
              required
              min={1}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="form-select-control"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="modal-form-group">
              <label className="form-label">Payer Email (Client)</label>
              <input
                type="email"
                value={formData.payerEmail}
                onChange={(e) => setFormData({ ...formData, payerEmail: e.target.value })}
                placeholder="client@example.com"
                className="form-select-control"
              />
            </div>
            <div className="modal-form-group">
              <label className="form-label">Payee Email (Student)</label>
              <input
                type="email"
                value={formData.payeeEmail}
                onChange={(e) => setFormData({ ...formData, payeeEmail: e.target.value })}
                placeholder="student@example.com"
                className="form-select-control"
              />
            </div>
          </div>

          <div className="modal-form-group">
            <label className="form-label">Payment Gateway</label>
            <select
              value={formData.paymentGateway}
              onChange={(e) => setFormData({ ...formData, paymentGateway: e.target.value })}
              className="form-select-control"
            >
              <option value="upi">UPI (Instant)</option>
              <option value="razorpay">Razorpay</option>
              <option value="stripe">Stripe</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="wallet">Internal Wallet</option>
            </select>
          </div>

          <div className="modal-form-group">
            <label className="form-label">Notes / Reference Description</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="admin-notes-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="admin-btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-btn-primary">
              Record Transaction
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Process Refund Modal */}
      <AdminModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="Issue Transaction Refund"
        subtitle={`Transaction: ${selectedTxn?.transactionId} · ₹${selectedTxn?.amount}`}
        footer={
          <>
            <button className="admin-btn-secondary" onClick={() => setRefundModalOpen(false)}>
              Cancel
            </button>
            <button className="admin-btn-primary" onClick={handleProcessRefund}>
              Confirm Refund
            </button>
          </>
        }
      >
        <p style={{ margin: '0 0 16px', color: '#4B5563', fontSize: '13.5px' }}>
          Issuing a refund will reverse the gross amount of <strong>₹{selectedTxn?.amount}</strong> back to the payer and mark this transaction as refunded in the platform audit ledger.
        </p>

        <div className="modal-form-group">
          <label className="form-label">Reason for Refund</label>
          <textarea
            required
            rows={3}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="e.g. Mutual project cancellation, milestone dispute resolved in favor of client..."
            className="admin-notes-textarea"
          />
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminTransactionsPage;
