import React from 'react';
import './StatusBadge.css';

const StatusBadge = ({ status, text }) => {
  if (!status) return null;

  const normalized = status.toString().toLowerCase().replace(/\s+/g, '_');
  const displayText = text || status.replace(/_/g, ' ');

  return (
    <span className={`status-badge badge-${normalized}`}>
      <span className="badge-dot" />
      {displayText}
    </span>
  );
};

export default StatusBadge;
