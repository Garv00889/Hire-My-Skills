import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FolderGit2,
  Eye,
  Edit,
  Trash2,
  Star,
  Calendar,
  Users,
  DollarSign,
  Tag,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import {
  getAdminProjects,
  getAdminProjectById,
  updateAdminProjectStatus,
  deleteAdminProject,
} from '../services/adminApi';
import toast from 'react-hot-toast';
import './AdminProjectsPage.css';

const AdminProjectsPage = () => {
  const { id: routeProjectId } = useParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('open');
  const [isFeatured, setIsFeatured] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Auto-open project details if id is in route param
  useEffect(() => {
    if (routeProjectId) {
      handleOpenDetails({ _id: routeProjectId });
    }
  }, [routeProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [page, search, selectedStatus, selectedCategory]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminProjects({
        page,
        limit: 15,
        search,
        status: selectedStatus,
        category: selectedCategory,
      });
      setProjects(res.data?.projects || []);
      setTotalRecords(res.data?.total || 0);
      setTotalPages(res.data?.pages || 1);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to load projects';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (proj) => {
    setSelectedProject(proj);
    setDetailsModalOpen(true);
    try {
      setLoadingDetails(true);
      const res = await getAdminProjectById(proj._id);
      setProjectDetails(res.data);
    } catch (err) {
      toast.error('Failed to load project details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenStatusModal = (proj) => {
    setSelectedProject(proj);
    setNewStatus(proj.status);
    setIsFeatured(proj.isFeatured || false);
    setAdminNotes(proj.adminNotes || '');
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    try {
      await updateAdminProjectStatus(selectedProject._id, {
        status: newStatus,
        isFeatured,
        adminNotes,
      });
      toast.success('Project updated successfully');
      setStatusModalOpen(false);
      fetchProjects();
    } catch (err) {
      toast.error('Failed to update project status');
    }
  };

  const handleDeleteProject = async (proj) => {
    if (!window.confirm(`Are you sure you want to delete "${proj.title}"? All associated proposals will also be removed.`)) {
      return;
    }
    try {
      await deleteAdminProject(proj._id);
      toast.success('Project removed');
      fetchProjects();
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const columns = [
    {
      title: 'Project Title',
      key: 'title',
      render: (row) => (
        <div className="table-project-cell">
          <div className="table-project-title-row">
            <span className="table-project-name">{row.title}</span>
            {row.isFeatured && (
              <span className="featured-pill" title="Featured on Homepage">
                <Star size={11} fill="#F5A623" /> Featured
              </span>
            )}
          </div>
          <span className="table-project-creator">
            by {row.creator?.name || 'Deleted / Unknown User'} · {row.category || 'General'}
          </span>
        </div>
      ),
    },
    {
      title: 'Budget',
      key: 'budget',
      render: (row) => (
        <span className="table-budget">
          ₹{(row.budget || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Proposals',
      key: 'proposals',
      render: (row) => (
        <span className="table-badge-count">
          {row.applicationsCount || 0} bids
        </span>
      ),
    },
    {
      title: 'Level',
      key: 'level',
      render: (row) => <span className="table-level-tag">{row.level}</span>,
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
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions-strip">
          <button
            className="action-icon-btn"
            title="Inspect Details & Applications"
            onClick={() => handleOpenDetails(row)}
          >
            <Eye size={16} />
          </button>
          <button
            className="action-icon-btn"
            title="Update Status / Feature"
            onClick={() => handleOpenStatusModal(row)}
          >
            <Edit size={16} />
          </button>
          <button
            className="action-icon-btn danger"
            title="Delete Project"
            onClick={() => handleDeleteProject(row)}
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
        value={selectedStatus}
        onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Statuses</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="closed">Closed</option>
        <option value="flagged">Flagged</option>
      </select>

      <select
        value={selectedCategory}
        onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Categories</option>
        <option value="AI">AI / Machine Learning</option>
        <option value="webdev">Web Development</option>
        <option value="UI/UX">UI/UX Design</option>
        <option value="college project">College Projects</option>
        <option value="business">Business</option>
        <option value="corporate">Corporate</option>
      </select>
    </div>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Freelance Projects</h1>
          <p className="admin-page-subtitle">
            Moderate client job postings, check proposal activity, verify requirements, and manage project statuses.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-error-banner">
          <div className="error-banner-content">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="admin-retry-btn" onClick={fetchProjects}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

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
        searchPlaceholder="Search project titles, scopes..."
        filterComponent={filterComponent}
      />

      {/* Project Details Modal */}
      <AdminModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={projectDetails?.project?.title || selectedProject?.title || 'Project Details'}
        subtitle={`ID: ${selectedProject?._id}`}
        maxWidth="750px"
      >
        {loadingDetails ? (
          <div className="modal-spinner-box">
            <div className="admin-spinner" />
            <p>Loading project details and proposals...</p>
          </div>
        ) : (
          <div className="project-modal-content">
            <div className="project-meta-grid">
              <div className="meta-item">
                <span className="meta-lbl">Client</span>
                <span className="meta-val">
                  {projectDetails?.project?.creator?.name || 'Deleted / Unknown User'}{' '}
                  {projectDetails?.project?.creator?.email ? `(${projectDetails.project.creator.email})` : ''}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Budget</span>
                <span className="meta-val">₹{(projectDetails?.project?.budget || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Category & Level</span>
                <span className="meta-val">{projectDetails?.project?.category || 'General'} · {projectDetails?.project?.level || 'Intermediate'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Team Size Required</span>
                <span className="meta-val">{projectDetails?.project?.membersRequired || 1} members</span>
              </div>
            </div>

            <div className="project-description-box">
              <span className="meta-lbl">Project Description</span>
              <p>{projectDetails?.project?.description || 'No description provided.'}</p>
            </div>

            {projectDetails?.project?.skillRequirements?.length > 0 && (
              <div className="skills-block">
                <span className="meta-lbl">Required Skills</span>
                <div className="skills-chips">
                  {projectDetails.project.skillRequirements.map((s, idx) => (
                    <span key={idx} className="skill-chip">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Applications List */}
            <div className="project-proposals-section">
              <span className="meta-lbl">Proposals Received ({projectDetails?.applications?.length || 0})</span>
              {projectDetails?.applications?.length === 0 ? (
                <p className="empty-subtext">No proposals submitted yet</p>
              ) : (
                <div className="proposals-mini-list">
                  {projectDetails?.applications?.map((app, idx) => (
                    <div key={idx} className="proposal-mini-row">
                      <div>
                        <strong>{app.applicant?.name || 'Deleted / Unknown Student'}</strong>
                        <p>{app.message || 'No proposal pitch included'}</p>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminModal>

      {/* Edit Status Modal */}
      <AdminModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Project Status"
        subtitle={`Adjust status for "${selectedProject?.title}"`}
        footer={
          <>
            <button className="admin-btn-secondary" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </button>
            <button className="admin-btn-primary" onClick={handleSaveStatus}>
              Save Changes
            </button>
          </>
        }
      >
        <div className="modal-form-group">
          <label className="form-label">Project Status</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select-control"
          >
            <option value="open">Open (Accepting Proposals)</option>
            <option value="in_progress">In Progress (Active Work)</option>
            <option value="completed">Completed (Successfully Delivered)</option>
            <option value="closed">Closed (Archived)</option>
            <option value="flagged">Flagged (Suspended / Under Review)</option>
          </select>
        </div>

        <div className="modal-checkbox-row">
          <input
            type="checkbox"
            id="featuredCheckbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          <label htmlFor="featuredCheckbox">
            <strong>Feature on Homepage</strong>
            <p>Highlights this project on the main landing page and tops search ranking.</p>
          </label>
        </div>

        <div className="modal-form-group" style={{ marginTop: '16px' }}>
          <label className="form-label">Administrative Notes</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="Reason for status change or internal notes..."
            className="admin-notes-textarea"
          />
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminProjectsPage;
