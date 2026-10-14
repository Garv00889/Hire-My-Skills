import React, { useState, useEffect } from 'react';
import {
  Star,
  Eye,
  EyeOff,
  Trash2,
  Flag,
  User,
} from 'lucide-react';
import AdminTable from '../components/AdminTable';
import StatusBadge from '../components/StatusBadge';
import { getAdminReviews, updateAdminReviewStatus, deleteAdminReview } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedRating, setSelectedRating] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, [page, search, selectedRating, selectedStatus]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await getAdminReviews({
        page,
        limit: 15,
        search,
        rating: selectedRating,
        status: selectedStatus,
      });
      setReviews(res.data.reviews);
      setTotalRecords(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (review, targetStatus) => {
    try {
      await updateAdminReviewStatus(review._id, { status: targetStatus });
      toast.success(`Review status changed to ${targetStatus}`);
      fetchReviews();
    } catch (err) {
      toast.error('Failed to update review status');
    }
  };

  const handleDelete = async (review) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await deleteAdminReview(review._id);
      toast.success('Review deleted');
      fetchReviews();
    } catch (err) {
      toast.error('Failed to delete review');
    }
  };

  const columns = [
    {
      title: 'Reviewer',
      key: 'reviewer',
      render: (row) => (
        <div className="table-user-cell">
          <div className="table-user-avatar">
            {row.reviewer?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="table-user-meta">
            <span className="table-user-name">{row.reviewer?.name || 'User'}</span>
            <span className="table-user-email">{row.reviewer?.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Rating & Feedback',
      key: 'rating',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#F5A623' }}>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                fill={i < row.rating ? '#F5A623' : 'none'}
                color="#F5A623"
              />
            ))}
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginLeft: '4px' }}>
              {row.rating}.0
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#4B5563', maxWidth: '380px' }}>
            "{row.comment}"
          </p>
        </div>
      ),
    },
    {
      title: 'Target / Project',
      key: 'target',
      render: (row) => (
        <div style={{ fontSize: '12.5px', color: '#374151' }}>
          {row.project?.title || row.reviewee?.name || 'Marketplace Item'}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="table-actions-strip">
          {row.status === 'published' ? (
            <button
              className="action-icon-btn"
              title="Hide Review from Marketplace"
              onClick={() => handleToggleStatus(row, 'hidden')}
            >
              <EyeOff size={16} />
            </button>
          ) : (
            <button
              className="action-icon-btn"
              title="Publish Review"
              onClick={() => handleToggleStatus(row, 'published')}
            >
              <Eye size={16} />
            </button>
          )}
          <button
            className="action-icon-btn danger"
            title="Delete Review"
            onClick={() => handleDelete(row)}
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
        value={selectedRating}
        onChange={(e) => { setSelectedRating(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Ratings</option>
        <option value="5">5 Stars</option>
        <option value="4">4 Stars</option>
        <option value="3">3 Stars</option>
        <option value="2">2 Stars</option>
        <option value="1">1 Star</option>
      </select>

      <select
        value={selectedStatus}
        onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
        className="admin-select-filter"
      >
        <option value="all">All Statuses</option>
        <option value="published">Published</option>
        <option value="hidden">Hidden</option>
        <option value="flagged">Flagged</option>
      </select>
    </div>
  );

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Reviews & Ratings Moderation</h1>
          <p className="admin-page-subtitle">
            Inspect feedback comments, monitor client ratings on student freelancers, and moderate inappropriate submissions.
          </p>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={reviews}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search review comments..."
        filterComponent={filterComponent}
      />
    </div>
  );
};

export default AdminReviewsPage;
