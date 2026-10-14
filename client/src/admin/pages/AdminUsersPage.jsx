import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Eye,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  CheckCircle,
  Clock,
  Wallet,
  Edit3,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import {
  getAdminUsers,
  getAdminUserById,
  updateAdminUserStatus,
  updateAdminUserRole,
  updateAdminUserNotes,
  deleteAdminUser,
} from '../services/adminApi';
import toast from 'react-hot-toast';
import './AdminUsersPage.css';

const AdminUsersPage = ({ defaultRole }) => {
  const location = useLocation();

  // If URL is /admin/students -> default to 'student'; /admin/clients -> 'client'
  const initialRole = defaultRole || (
    location.pathname.includes('/students') ? 'student' :
    location.pathname.includes('/clients') ? 'client' : 'all'
  );

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [adminNotesText, setAdminNotesText] = useState('');

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('active');
  const [isVerifiedCheck, setIsVerifiedCheck] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('student');

  useEffect(() => {
    fetchUsers();
  }, [page, search, selectedRole, selectedStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers({
        page,
        limit: 15,
        search,
        role: selectedRole,
        status: selectedStatus,
      });
      setUsers(res.data.users);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (user) => {
    setSelectedUser(user);
    setDetailsModalOpen(true);
    setAdminNotesText(user.adminNotes || '');
    try {
      setLoadingDetails(true);
      const res = await getAdminUserById(user._id);
      setUserDetails(res.data);
    } catch (err) {
      toast.error('Failed to load full user details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenStatusModal = (user) => {
    setSelectedUser(user);
    setNewStatus(user.status);
    setIsVerifiedCheck(user.isVerified || false);
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    try {
      await updateAdminUserStatus(selectedUser._id, {
        status: newStatus,
        isVerified: isVerifiedCheck,
      });
      toast.success('User status updated');
      setStatusModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      await updateAdminUserRole(selectedUser._id, { role: newRole });
      toast.success('User role updated');
      setRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateAdminUserNotes(selectedUser._id, { adminNotes: adminNotesText });
      toast.success('Admin notes saved');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to save notes');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${user.name}? This action is irreversible.`)) {
      return;
    }
    try {
      await deleteAdminUser(user._id);
      toast.success('User permanently deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const columns = [
    {
      title: 'User / Profile',
      key: 'name',
      render: (row) => (
        <div className="table-user-cell">
          <div className="table-user-avatar">
            {row.profilePicture ? (
              <img src={row.profilePicture} alt={row.name} />
            ) : (
              row.name[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="table-user-meta">
            <span className="table-user-name">
              {row.name}
              {row.isVerified && <CheckCircle size={14} className="verified-check" title="Verified Account" />}
            </span>
            <span className="table-user-email">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      key: 'role',
      render: (row) => <StatusBadge status={row.role} />,
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: 'Wallet / Earnings',
      key: 'wallet',
      render: (row) => (
        <div className="table-wallet-meta">
          <span>₹{(row.walletBalance || 0).toLocaleString('en-IN')}</span>
          <span className="earnings-sub">Earned: ₹{(row.totalEarnings || 0).toLocaleString('en-IN')}</span>
        </div>
      ),
    },
    {
      title: 'Joined',
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
            title="View User Details"
            onClick={() => handleOpenDetails(row)}
          >
            <Eye size={16} />
          </button>
          <button
            className="action-icon-btn"
            title="Change Status / Verification"
            onClick={() => handleOpenStatusModal(row)}
          >
            <UserCheck size={16} />
          </button>
          <button
            className="action-icon-btn"
            title="Edit Role / Permissions"
            onClick={() => handleOpenRoleModal(row)}
          >
            <Shield size={16} />
          </button>
          <button
            className="action-icon-btn danger"
            title="Delete User"
            onClick={() => handleDeleteUser(row)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const filterComponent = (
    <div className="admin-filters-group">
      <select
        value={selectedRole}
        onChange={(e) => { setSelectedRole(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Roles</option>
        <option value="student">Students</option>
        <option value="client">Clients</option>
        <option value="admin">Admins</option>
        <option value="moderator">Moderators</option>
      </select>

      <select
        value={selectedStatus}
        onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="pending_verification">Pending Verification</option>
        <option value="suspended">Suspended</option>
        <option value="banned">Banned</option>
      </select>
    </div>
  );

  return (
    <div className="admin-users-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">
            {selectedRole === 'student' ? 'Student Freelancers' :
             selectedRole === 'client' ? 'Client Directory' : 'User Management'}
          </h1>
          <p className="admin-page-subtitle">
            Manage student freelancers, enterprise clients, administrator privileges, and verification status.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={users}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search by name, email, phone..."
        filterComponent={filterComponent}
      />

      {/* User Details Drawer Modal */}
      <AdminModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedUser?.name || 'User Profile'}
        subtitle={`ID: ${selectedUser?._id} · ${selectedUser?.email}`}
        maxWidth="750px"
      >
        {loadingDetails ? (
          <div className="modal-spinner-box">
            <div className="admin-spinner" />
            <p>Loading full profile & marketplace history...</p>
          </div>
        ) : (
          <div className="user-details-layout">
            <div className="user-details-summary-card">
              <div className="user-avatar-large">
                {selectedUser?.profilePicture ? (
                  <img src={selectedUser.profilePicture} alt={selectedUser.name} />
                ) : (
                  selectedUser?.name?.[0]?.toUpperCase()
                )}
              </div>
              <div className="user-meta-top">
                <h3>{selectedUser?.name}</h3>
                <p>{selectedUser?.tagline || 'No tagline specified'}</p>
                <div className="user-badges-strip">
                  <StatusBadge status={selectedUser?.role} />
                  <StatusBadge status={selectedUser?.status} />
                  {selectedUser?.isVerified && (
                    <span className="verified-pill">
                      <CheckCircle size={13} /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="user-info-grid">
              <div className="info-block">
                <span className="info-label">Contact Number</span>
                <span className="info-val">{selectedUser?.contactNumber || 'N/A'}</span>
              </div>
              <div className="info-block">
                <span className="info-label">Location</span>
                <span className="info-val">{selectedUser?.location || 'N/A'}</span>
              </div>
              <div className="info-block">
                <span className="info-label">Wallet Balance</span>
                <span className="info-val">₹{(selectedUser?.walletBalance || 0).toLocaleString()}</span>
              </div>
              <div className="info-block">
                <span className="info-label">Total Earnings</span>
                <span className="info-val">₹{(selectedUser?.totalEarnings || 0).toLocaleString()}</span>
              </div>
            </div>

            {selectedUser?.skills?.length > 0 && (
              <div className="skills-block">
                <span className="info-label">Technical Skills</span>
                <div className="skills-chips">
                  {selectedUser.skills.map((s, idx) => (
                    <span key={idx} className="skill-chip">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Private Notes */}
            <div className="admin-notes-section">
              <span className="info-label">Internal Admin Notes (Private)</span>
              <textarea
                value={adminNotesText}
                onChange={(e) => setAdminNotesText(e.target.value)}
                placeholder="Write internal notes about this user (visible to staff only)..."
                rows={3}
                className="admin-notes-textarea"
              />
              <button onClick={handleSaveNotes} className="admin-save-notes-btn">
                Save Notes
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      {/* Status Modal */}
      <AdminModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update User Status"
        subtitle={`Modify account status and verification for ${selectedUser?.name}`}
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
        <div className="modal-form-group">
          <label className="form-label">Account Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select-control"
          >
            <option value="active">Active (Full Access)</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="suspended">Suspended (Temporary Freeze)</option>
            <option value="banned">Banned (Permanent Block)</option>
          </select>
        </div>

        <div className="modal-checkbox-row">
          <input
            type="checkbox"
            id="verifyCheckbox"
            checked={isVerifiedCheck}
            onChange={(e) => setIsVerifiedCheck(e.target.checked)}
          />
          <label htmlFor="verifyCheckbox">
            <strong>Mark Account as Verified</strong>
            <p>Displays a verified student/client badge next to their name on the marketplace.</p>
          </label>
        </div>
      </AdminModal>

      {/* Role Modal */}
      <AdminModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Change User Role"
        subtitle={`Promote or adjust marketplace role for ${selectedUser?.name}`}
        footer={
          <>
            <button className="admin-btn-secondary" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </button>
            <button className="admin-btn-primary" onClick={handleSaveRole}>
              Update Role
            </button>
          </>
        }
      >
        <div className="modal-form-group">
          <label className="form-label">Marketplace Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="form-select-control"
          >
            <option value="student">Student Freelancer</option>
            <option value="client">Client (Project Creator)</option>
            <option value="moderator">Content Moderator</option>
            <option value="support">Support Agent</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminUsersPage;
