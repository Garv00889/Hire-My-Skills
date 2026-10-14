import React, { useState, useEffect } from 'react';
import {
  UserCog,
  ShieldCheck,
  Edit,
  Check,
  X,
  Plus,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import { getAdminRoles, updateAdminUserRole } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminRolesPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [roleSelect, setRoleSelect] = useState('moderator');
  const [perms, setPerms] = useState({
    canManageUsers: true,
    canManageProjects: true,
    canManageFinance: false,
    canManageTickets: true,
    canManageSettings: false,
    canManageAnnouncements: true,
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await getAdminRoles();
      setStaff(res.data);
    } catch (err) {
      toast.error('Failed to load administrative staff');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedStaff(user);
    setRoleSelect(user.role);
    setPerms(user.adminPermissions || {
      canManageUsers: true,
      canManageProjects: true,
      canManageFinance: false,
      canManageTickets: true,
      canManageSettings: false,
      canManageAnnouncements: true,
    });
    setModalOpen(true);
  };

  const handleSaveRoleAndPerms = async () => {
    try {
      await updateAdminUserRole(selectedStaff._id, {
        role: roleSelect,
        adminPermissions: perms,
      });
      toast.success('Admin staff permissions updated');
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update permissions');
    }
  };

  const columns = [
    {
      title: 'Administrator / Staff',
      key: 'name',
      render: (row) => (
        <div className="table-user-cell">
          <div className="table-user-avatar">
            {row.name?.[0]?.toUpperCase()}
          </div>
          <div className="table-user-meta">
            <span className="table-user-name">{row.name}</span>
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
      title: 'Privileges Overview',
      key: 'perms',
      render: (row) => {
        if (row.role === 'superadmin') {
          return <span style={{ fontWeight: 600, color: '#F5A623', fontSize: '13px' }}>Full SuperAdmin Access</span>;
        }
        const activePerms = [];
        if (row.adminPermissions?.canManageUsers) activePerms.push('Users');
        if (row.adminPermissions?.canManageProjects) activePerms.push('Projects');
        if (row.adminPermissions?.canManageFinance) activePerms.push('Finance');
        if (row.adminPermissions?.canManageTickets) activePerms.push('Tickets');
        if (row.adminPermissions?.canManageSettings) activePerms.push('Settings');

        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {activePerms.map((p, idx) => (
              <span key={idx} style={{ background: '#F3F4F6', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', color: '#374151' }}>
                {p}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Last Active',
      key: 'lastLogin',
      render: (row) => (
        <span className="table-date">
          {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : 'Active Recently'}
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
          title="Configure Permissions"
          onClick={() => handleOpenEdit(row)}
        >
          <Edit size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Admin Roles & Permissions</h1>
          <p className="admin-page-subtitle">
            Manage authorized administrative staff, grant modular permission scopes, and configure role-based access control.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={staff}
        loading={loading}
      />

      {/* Permissions Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Administrative Permissions"
        subtitle={`Staff Member: ${selectedStaff?.name} (${selectedStaff?.email})`}
        footer={
          <>
            <button className="admin-btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="admin-btn-primary" onClick={handleSaveRoleAndPerms}>
              Save Permissions
            </button>
          </>
        }
      >
        <div className="modal-form-group">
          <label className="form-label">Admin Role</label>
          <select
            value={roleSelect}
            onChange={(e) => setRoleSelect(e.target.value)}
            className="form-select-control"
          >
            <option value="moderator">Moderator</option>
            <option value="support">Support Agent</option>
            <option value="admin">Platform Admin</option>
            <option value="superadmin">Super Administrator</option>
          </select>
        </div>

        {roleSelect !== 'superadmin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Permission Scopes</span>

            {[
              { key: 'canManageUsers', label: 'User Management (Status, Verification, Notes)' },
              { key: 'canManageProjects', label: 'Projects & Proposals (Moderate jobs, reviews)' },
              { key: 'canManageFinance', label: 'Finance & Payments (Approve payouts, refunds)' },
              { key: 'canManageTickets', label: 'Tickets & Disputes (Arbitrate, respond)' },
              { key: 'canManageAnnouncements', label: 'Announcements (Broadcast platform banners)' },
              { key: 'canManageSettings', label: 'System Settings (Commission %, configurations)' },
            ].map((p) => (
              <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: '#1F2937', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!perms[p.key]}
                  onChange={(e) => setPerms({ ...perms, [p.key]: e.target.checked })}
                  style={{ accentColor: '#F5A623' }}
                />
                {p.label}
              </label>
            ))}
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default AdminRolesPage;
