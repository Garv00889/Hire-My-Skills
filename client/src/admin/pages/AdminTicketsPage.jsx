import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import {
  getAdminTickets,
  getAdminTicketById,
  replyAdminTicket,
  updateAdminTicketStatus,
} from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Drawer / Conversation Modal
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [ticketStatusSelect, setTicketStatusSelect] = useState('open');

  useEffect(() => {
    fetchTickets();
  }, [page, search, selectedStatus, selectedPriority, selectedType]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await getAdminTickets({
        page,
        limit: 15,
        search,
        status: selectedStatus,
        priority: selectedPriority,
        type: selectedType,
      });
      setTickets(res.data.tickets);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (tkt) => {
    setTicketModalOpen(true);
    setReplyText('');
    try {
      setLoadingTicket(true);
      const res = await getAdminTicketById(tkt._id);
      setActiveTicket(res.data);
      setTicketStatusSelect(res.data.status);
      setResolutionText(res.data.resolution || '');
    } catch (err) {
      toast.error('Failed to load ticket details');
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      const res = await replyAdminTicket(activeTicket._id, { message: replyText });
      toast.success('Admin response sent');
      setReplyText('');
      // Refresh active ticket
      const refreshed = await getAdminTicketById(activeTicket._id);
      setActiveTicket(refreshed.data);
      fetchTickets();
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  const handleSaveStatusAndResolution = async () => {
    try {
      await updateAdminTicketStatus(activeTicket._id, {
        status: ticketStatusSelect,
        resolution: resolutionText,
      });
      toast.success('Ticket updated');
      setTicketModalOpen(false);
      fetchTickets();
    } catch (err) {
      toast.error('Failed to update ticket');
    }
  };

  const columns = [
    {
      title: 'Ticket # / Subject',
      key: 'ticketNumber',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '13.5px', color: '#111827' }}>{row.ticketNumber}</strong>
            <StatusBadge status={row.priority} />
          </div>
          <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
            {row.subject}
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
      title: 'Reporter',
      key: 'reporter',
      render: (row) => (
        <div style={{ fontSize: '12.5px', color: '#374151' }}>
          <strong>{row.reporter?.name || 'User'}</strong>
          <div style={{ color: '#6B7280' }}>{row.reporter?.email}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: 'Created',
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
          title="Open Ticket Thread & Arbitrate"
          onClick={() => handleOpenTicket(row)}
        >
          <MessageSquare size={16} />
        </button>
      ),
    },
  ];

  const filterComponent = (
    <div className="admin-filters-group">
      <select
        value={selectedStatus}
        onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Statuses</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>

      <select
        value={selectedPriority}
        onChange={(e) => { setSelectedPriority(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        value={selectedType}
        onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Categories</option>
        <option value="dispute">Project Dispute</option>
        <option value="complaint">User Complaint</option>
        <option value="billing">Billing / Payout</option>
        <option value="general_inquiry">General Support</option>
      </select>
    </div>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Complaints, Disputes & Support Tickets</h1>
          <p className="admin-page-subtitle">
            Arbitrate project milestone disagreements, investigate student/client complaints, and provide support.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={tickets}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search ticket #, subject, description..."
        filterComponent={filterComponent}
      />

      {/* Ticket Conversation & Arbitration Modal */}
      <AdminModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        title={activeTicket?.subject || 'Support Ticket'}
        subtitle={`Ticket: ${activeTicket?.ticketNumber} · Reporter: ${activeTicket?.reporter?.name}`}
        maxWidth="750px"
      >
        {loadingTicket ? (
          <div className="modal-spinner-box">
            <div className="admin-spinner" />
            <p>Loading ticket discussion thread...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Ticket Info Card */}
            <div style={{ background: '#FAF9F6', border: '1px solid #EFECE6', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <StatusBadge status={activeTicket?.type} />
                  <StatusBadge status={activeTicket?.priority} />
                  <StatusBadge status={activeTicket?.status} />
                </div>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  {new Date(activeTicket?.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '13.5px', color: '#374151', lineHeight: '1.5' }}>
                {activeTicket?.description}
              </p>
            </div>

            {/* Response Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                Conversation Thread ({activeTicket?.responses?.length || 0})
              </span>
              {activeTicket?.responses?.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: msg.isAdmin ? '#FFF8EB' : '#F3F4F6',
                    border: `1px solid ${msg.isAdmin ? 'rgba(245, 166, 35, 0.4)' : '#E5E7EB'}`,
                    alignSelf: msg.isAdmin ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '12px', color: msg.isAdmin ? '#D4891A' : '#111827' }}>
                      {msg.isAdmin ? '🛡️ Administrator Response' : msg.sender?.name || 'User'}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Quick Reply Form */}
            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                type="text"
                placeholder="Type official administrator response..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="form-select-control"
                style={{ flex: 1 }}
              />
              <button type="submit" className="admin-btn-primary" style={{ padding: '0 16px' }}>
                <Send size={15} /> Reply
              </button>
            </form>

            {/* Status & Resolution Controls */}
            <div style={{ borderTop: '1px solid #E8E5DF', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div className="modal-form-group">
                  <label className="form-label">Update Status</label>
                  <select
                    value={ticketStatusSelect}
                    onChange={(e) => setTicketStatusSelect(e.target.value)}
                    className="form-select-control"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="modal-form-group">
                  <label className="form-label">Official Resolution Summary</label>
                  <input
                    type="text"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="e.g. Escrow released to student after code audit..."
                    className="form-select-control"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveStatusAndResolution}
                className="admin-btn-secondary"
                style={{ alignSelf: 'flex-end' }}
              >
                Save Ticket Resolution
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default AdminTicketsPage;
