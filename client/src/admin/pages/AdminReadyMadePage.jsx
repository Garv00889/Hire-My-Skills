import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Eye,
  Edit,
  Trash2,
  Star,
  ExternalLink,
  DollarSign,
  Download,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import {
  getAdminReadyMadeProjects,
  createAdminReadyMadeProject,
  updateAdminReadyMadeProjectStatus,
  deleteAdminReadyMadeProject,
} from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminReadyMadePage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'college project',
    price: 1499,
    techStack: 'React, Node.js, Express, MongoDB',
    demoUrl: '',
    githubUrl: '',
    downloadUrl: '',
    isFeatured: true,
  });

  const [editStatus, setEditStatus] = useState('approved');
  const [editPrice, setEditPrice] = useState(0);
  const [editFeatured, setEditFeatured] = useState(false);

  useEffect(() => {
    fetchReadyMade();
  }, [page, search, selectedStatus]);

  const fetchReadyMade = async () => {
    try {
      setLoading(true);
      const res = await getAdminReadyMadeProjects({
        page,
        limit: 15,
        search,
        status: selectedStatus,
      });
      setProjects(res.data.projects);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load ready-made projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createAdminReadyMadeProject(formData);
      toast.success('Ready-made project published successfully');
      setCreateModalOpen(false);
      fetchReadyMade();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create digital product');
    }
  };

  const handleOpenEdit = (proj) => {
    setSelectedProject(proj);
    setEditStatus(proj.status);
    setEditPrice(proj.price);
    setEditFeatured(proj.isFeatured || false);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateAdminReadyMadeProjectStatus(selectedProject._id, {
        status: editStatus,
        price: editPrice,
        isFeatured: editFeatured,
      });
      toast.success('Ready-made project updated');
      setEditModalOpen(false);
      fetchReadyMade();
    } catch (err) {
      toast.error('Failed to update project');
    }
  };

  const handleDelete = async (proj) => {
    if (!window.confirm(`Delete "${proj.title}"?`)) return;
    try {
      await deleteAdminReadyMadeProject(proj._id);
      toast.success('Project deleted');
      fetchReadyMade();
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const columns = [
    {
      title: 'Digital Project / Title',
      key: 'title',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '13.5px', color: '#111827' }}>{row.title}</strong>
            {row.isFeatured && (
              <span className="featured-pill">
                <Star size={11} fill="#F5A623" /> Featured
              </span>
            )}
          </div>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Category: {row.category} · Seller: {row.seller?.name || 'Admin'}
          </span>
        </div>
      ),
    },
    {
      title: 'Price',
      key: 'price',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#111827' }}>
          ₹{(row.price || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Sales & Downloads',
      key: 'sales',
      render: (row) => (
        <span style={{ fontSize: '13px', color: '#374151' }}>
          {row.salesCount || 0} sales ({row.rating || 5.0} ★)
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: 'Links',
      key: 'links',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {row.demoUrl && (
            <a href={row.demoUrl} target="_blank" rel="noreferrer" title="Live Preview" style={{ color: '#D4891A' }}>
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions-strip">
          <button className="action-icon-btn" onClick={() => handleOpenEdit(row)} title="Edit Details">
            <Edit size={16} />
          </button>
          <button className="action-icon-btn danger" onClick={() => handleDelete(row)} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const actionButton = (
    <button className="admin-btn-primary" onClick={() => setCreateModalOpen(true)}>
      <Plus size={16} /> Add Digital Product
    </button>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Ready-Made Coding & College Projects</h1>
          <p className="admin-page-subtitle">
            Manage student-uploaded college source codes, full-stack templates, AI models, and digital software products.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={projects}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search ready-made projects..."
        actionButton={actionButton}
      />

      {/* Create Modal */}
      <AdminModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Publish Ready-Made Project"
        subtitle="Add a new digital asset or college source code to the marketplace"
        maxWidth="650px"
      >
        <form onSubmit={handleCreate}>
          <div className="modal-form-group">
            <label className="form-label">Project Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Full Stack MERN Hospital Management System"
              className="form-select-control"
            />
          </div>

          <div className="modal-form-group">
            <label className="form-label">Description & Key Features</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of features, tech stack, documentation included..."
              className="admin-notes-textarea"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="modal-form-group">
              <label className="form-label">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-select-control"
              >
                <option value="college project">College Project</option>
                <option value="webdev">Web Development</option>
                <option value="AI">AI & Machine Learning</option>
                <option value="mobile">Mobile App</option>
                <option value="blockchain">Blockchain & Web3</option>
                <option value="UI/UX">UI/UX Template</option>
              </select>
            </div>

            <div className="modal-form-group">
              <label className="form-label">Price (INR ₹)</label>
              <input
                type="number"
                required
                min={0}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="form-select-control"
              />
            </div>
          </div>

          <div className="modal-form-group">
            <label className="form-label">Tech Stack (Comma-separated)</label>
            <input
              type="text"
              value={formData.techStack}
              onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
              placeholder="e.g. React, Node.js, Express, MongoDB"
              className="form-select-control"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="modal-form-group">
              <label className="form-label">Live Demo URL</label>
              <input
                type="url"
                value={formData.demoUrl}
                onChange={(e) => setFormData({ ...formData, demoUrl: e.target.value })}
                placeholder="https://..."
                className="form-select-control"
              />
            </div>
            <div className="modal-form-group">
              <label className="form-label">GitHub / Repo URL</label>
              <input
                type="url"
                value={formData.githubUrl}
                onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                placeholder="https://github.com/..."
                className="form-select-control"
              />
            </div>
          </div>

          <div className="modal-checkbox-row" style={{ marginTop: '12px', marginBottom: '20px' }}>
            <input
              type="checkbox"
              id="createFeatured"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
            />
            <label htmlFor="createFeatured">
              <strong>Mark as Featured Product</strong>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="admin-btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-btn-primary">
              Publish Project
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Edit Modal */}
      <AdminModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Ready-Made Project"
        subtitle={selectedProject?.title}
        footer={
          <>
            <button className="admin-btn-secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button className="admin-btn-primary" onClick={handleSaveEdit}>
              Save Changes
            </button>
          </>
        }
      >
        <div className="modal-form-group">
          <label className="form-label">Status</label>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="form-select-control"
          >
            <option value="approved">Approved</option>
            <option value="pending_review">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="modal-form-group">
          <label className="form-label">Price (INR ₹)</label>
          <input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            className="form-select-control"
          />
        </div>

        <div className="modal-checkbox-row">
          <input
            type="checkbox"
            id="editFeatured"
            checked={editFeatured}
            onChange={(e) => setEditFeatured(e.target.checked)}
          />
          <label htmlFor="editFeatured">
            <strong>Featured on Storefront</strong>
          </label>
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminReadyMadePage;
