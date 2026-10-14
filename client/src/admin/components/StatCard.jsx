import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendLabel, color = 'gold', onClick }) => {
  return (
    <div className={`admin-stat-card theme-${color} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className="stat-card-icon-wrapper">
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-card-body">
        <h3 className="stat-card-value">{value}</h3>
        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
      </div>

      {(trend !== undefined || trendLabel) && (
        <div className="stat-card-footer">
          {trend !== undefined && (
            <span className={`stat-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
              {trend >= 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
          {trendLabel && <span className="stat-trend-label">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
