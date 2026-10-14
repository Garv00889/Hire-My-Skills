import React from 'react';
import { ChevronLeft, ChevronRight, Search, Inbox } from 'lucide-react';
import './AdminTable.css';

const AdminTable = ({
  columns,
  data = [],
  loading = false,
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  onPageChange,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterComponent,
  actionButton,
  emptyMessage = 'No records found',
}) => {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="admin-table-container">
      {/* Controls Bar */}
      {(onSearchChange || filterComponent || actionButton) && (
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left">
            {onSearchChange && (
              <div className="admin-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="admin-search-input"
                />
              </div>
            )}
            {filterComponent}
          </div>

          <div className="admin-table-toolbar-right">
            {actionButton}
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="admin-table-responsive">
        <table className="admin-data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={col.key || idx} style={{ width: col.width, textAlign: col.align || 'left' }}>
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="admin-table-loading-cell">
                  <div className="admin-spinner" />
                  <span>Loading platform data...</span>
                </td>
              </tr>
            ) : safeData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="admin-table-empty-cell">
                  <Inbox size={36} color="#9CA3AF" />
                  <p>{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              safeData.map((row, rIdx) => (
                <tr key={row._id || rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={col.key || cIdx} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row, rIdx) : row[col.dataIndex || col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="admin-table-pagination">
          <div className="admin-pagination-info">
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} records)
          </div>
          <div className="admin-pagination-actions">
            <button
              className="admin-page-btn"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="admin-page-current">{page}</span>
            <button
              className="admin-page-btn"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTable;
