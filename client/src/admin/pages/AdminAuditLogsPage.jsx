import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Eye,
  Clock,
  Terminal,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import { getAdminAuditLogs } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');

  // Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [page, search, selectedModel]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await getAdminAuditLogs({
        page,
        limit: 20,
        search,
        targetModel: selectedModel,
      });
      setLogs(res.data.logs);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = (log) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  const columns = [
    {
      title: 'Timestamp',
      key: 'createdAt',
      render: (row) => (
        <span style={{ fontSize: '12.5px', color: '#6B7280' }}>
          {new Date(row.createdAt).toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      ),
    },
    {
      title: 'Admin User',
      key: 'admin',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="table-user-avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
            {row.admin?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={{ fontSize: '13px' }}>
            <strong>{row.admin?.name || 'Administrator'}</strong>
            <div style={{ fontSize: '11.5px', color: '#6B7280' }}>{row.admin?.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Action Performed',
      key: 'action',
      render: (row) => (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          fontWeight: 700,
          color: '#1E293B',
          background: '#F1F5F9',
          padding: '3px 8px',
          borderRadius: '6px',
        }}>
          {row.action}
        </span>
      ),
    },
    {
      title: 'Target Resource',
      key: 'target',
      render: (row) => (
        <div style={{ fontSize: '13px' }}>
          <strong style={{ color: '#D4891A' }}>{row.targetModel}</strong>
          {row.targetName && <span style={{ color: '#4B5563' }}>: {row.targetName}</span>}
        </div>
      ),
    },
    {
      title: 'IP Address',
      key: 'ipAddress',
      render: (row) => (
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
          {row.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
    {
      title: 'Details',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <button
          className="action-icon-btn"
          title="Inspect Payload"
          onClick={() => handleInspect(row)}
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  const filterComponent = (
    <select
      value={selectedModel}
      onChange={(e) => { setSelectedModel(e.target.value); setPage(1); }}
      className="admin-select-filter"
    >
      <option value="all">All Resource Types</option>
      <option value="User">User</option>
      <option value="Project">Project</option>
      <option value="Application">Proposal</option>
      <option value="Transaction">Transaction</option>
      <option value="Payout">Payout</option>
      <option value="Ticket">Ticket</option>
      <option value="PlatformSettings">Settings</option>
      <option value="Security">Security</option>
    </select>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Security & Audit Logs</h1>
          <p className="admin-page-subtitle">
            Immutable administrative audit trail recording every state mutation, user status change, role promotion, and financial settlement.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={logs}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search actions or target identifiers..."
        filterComponent={filterComponent}
      />

      {/* Payload Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Audit Event Details"
        subtitle={`Action: ${selectedLog?.action} on ${selectedLog?.targetModel}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#FAF9F6', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
            <div><strong>Admin:</strong> {selectedLog?.admin?.name} ({selectedLog?.admin?.email})</div>
            <div><strong>Timestamp:</strong> {new Date(selectedLog?.createdAt).toLocaleString()}</div>
            <div><strong>IP Address:</strong> {selectedLog?.ipAddress || 'Internal'}</div>
            <div><strong>Target ID:</strong> {selectedLog?.targetId || 'N/A'}</div>
          </div>

          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
            Event Payload / Change Diff
          </span>

          <pre style={{
            background: '#1E293B',
            color: '#38BDF8',
            padding: '16px',
            borderRadius: '10px',
            fontSize: '12.5px',
            overflowX: 'auto',
            maxHeight: '260px',
            fontFamily: 'monospace',
          }}>
            {JSON.stringify(selectedLog?.details, null, 2) || '// No additional metadata recorded'}
          </pre>
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminAuditLogsPage;
