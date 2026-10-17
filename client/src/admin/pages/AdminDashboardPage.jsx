import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FolderGit2,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { getDashboardAnalytics } from '../services/adminApi';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboardAnalytics();
      setData(res.data);
    } catch (err) {
      console.error('Dashboard load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const metrics = data?.metrics || {};
  const monthlyData = data?.monthlyData || [];
  const categoryStats = data?.categoryStats || [];
  const recentProjects = data?.recentProjects || [];
  const recentTransactions = data?.recentTransactions || [];
  const recentAudits = data?.recentAudits || [];

  // Find max monthly revenue for proportional bar scaling
  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 10000);

  return (
    <div className="admin-dashboard-page">
      {/* Page Header */}
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Executive Dashboard</h1>
          <p className="admin-page-subtitle">
            Real-time overview of marketplace activity, financial metrics, and student project deliveries.
          </p>
        </div>
        <div className="admin-hero-actions">
          <Link to="/admin/announcements" className="admin-btn-secondary">
            Broadcast Alert
          </Link>
          <Link to="/admin/payouts" className="admin-btn-primary">
            Review Payouts ({metrics.pendingPayouts || 0})
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="admin-kpi-grid">
        <StatCard
          title="Total Users"
          value={metrics.totalUsers || 0}
          subtitle={`${metrics.totalStudents || 0} Students · ${metrics.totalClients || 0} Clients`}
          icon={Users}
          color="gold"
          trendLabel={`${metrics.newUsersToday || 0} joined today`}
        />

        <StatCard
          title="Active Projects"
          value={(metrics.openProjects || 0) + (metrics.inProgressProjects || 0)}
          subtitle={`${metrics.openProjects || 0} Open · ${metrics.inProgressProjects || 0} In Progress`}
          icon={FolderGit2}
          color="blue"
          trendLabel={`${metrics.totalApplications || 0} total proposals`}
        />

        <StatCard
          title="Platform Volume"
          value={`₹${(metrics.totalVolume || 0).toLocaleString('en-IN')}`}
          subtitle={`₹${(metrics.totalCommissions || 0).toLocaleString('en-IN')} Earned Commission`}
          icon={DollarSign}
          color="green"
          trendLabel="10% platform fee"
        />

        <StatCard
          title="Pending Attention"
          value={(metrics.pendingPayouts || 0) + (metrics.openTickets || 0)}
          subtitle={`${metrics.pendingPayouts || 0} Payouts · ${metrics.openTickets || 0} Open Disputes`}
          icon={AlertTriangle}
          color={metrics.pendingPayouts + metrics.openTickets > 0 ? 'red' : 'purple'}
          trendLabel="Requires action"
        />
      </div>

      {/* Mid Section: Revenue Chart & Category Distribution */}
      <div className="admin-analytics-row">
        {/* Monthly Revenue & Commission Bar Visualizer */}
        <div className="admin-chart-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Gross Marketplace Volume (Past 6 Months)</h2>
              <p className="admin-card-subtitle">Monthly transaction turnover and net platform commissions</p>
            </div>
            <div className="admin-chart-legend">
              <span className="legend-item"><span className="legend-dot vol" /> Volume (₹)</span>
              <span className="legend-item"><span className="legend-dot com" /> Commission (₹)</span>
            </div>
          </div>

          <div className="admin-bar-chart">
            {monthlyData.map((item, idx) => {
              const heightPct = Math.min(100, Math.max(12, (item.revenue / maxRevenue) * 100));
              return (
                <div key={idx} className="chart-bar-group">
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{ height: `${heightPct}%` }}
                      title={`₹${item.revenue.toLocaleString()} Volume`}
                    >
                      <span className="chart-bar-tooltip">₹{item.revenue}</span>
                    </div>
                  </div>
                  <span className="chart-bar-label">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Categories Breakdown */}
        <div className="admin-categories-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Project Categories</h2>
              <p className="admin-card-subtitle">Distribution by domain</p>
            </div>
          </div>

          <div className="category-bars-list">
            {categoryStats.length === 0 ? (
              <p className="empty-subtext">No projects recorded yet</p>
            ) : (
              categoryStats.map((cat, idx) => {
                const totalProj = metrics.totalProjects || 1;
                const pct = Math.round((cat.count / totalProj) * 100);
                return (
                  <div key={idx} className="category-row">
                    <div className="category-row-meta">
                      <span className="category-name">{cat._id}</span>
                      <span className="category-count">{cat.count} ({pct}%)</span>
                    </div>
                    <div className="category-progress-bg">
                      <div className="category-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity & Latest Projects */}
      <div className="admin-analytics-row bottom-row">
        {/* Recent Platform Projects */}
        <div className="admin-recent-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Recent Projects</h2>
              <p className="admin-card-subtitle">Latest postings across marketplace</p>
            </div>
            <Link to="/admin/projects" className="admin-card-link">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="recent-items-list">
            {recentProjects.length === 0 ? (
              <p className="empty-subtext">No projects posted yet</p>
            ) : (
              recentProjects.map((proj, idx) => (
                <div key={proj._id || idx} className="recent-item-row">
                  <div className="recent-item-left">
                    <div className="recent-item-icon project-icon">
                      <FolderGit2 size={16} />
                    </div>
                    <div>
                      <p className="recent-item-primary" title={proj.title}>
                        {proj.title?.length > 28 ? `${proj.title.substring(0, 28)}...` : proj.title}
                      </p>
                      <p className="recent-item-secondary">
                        by {proj.creator?.name || 'Client'} · {proj.category || 'General'}
                      </p>
                    </div>
                  </div>
                  <div className="recent-item-right">
                    <span className="recent-item-amount">₹{(proj.budget || 0).toLocaleString('en-IN')}</span>
                    <StatusBadge status={proj.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Platform Transactions */}
        <div className="admin-recent-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Recent Transactions</h2>
            <Link to="/admin/transactions" className="admin-card-link">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="recent-items-list">
            {recentTransactions.length === 0 ? (
              <p className="empty-subtext">No transactions recorded</p>
            ) : (
              recentTransactions.map((txn, idx) => (
                <div key={idx} className="recent-item-row">
                  <div className="recent-item-left">
                    <div className="recent-item-icon">
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <p className="recent-item-primary">{txn.transactionId}</p>
                      <p className="recent-item-secondary">
                        {txn.type.replace(/_/g, ' ')} · {txn.paymentGateway?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="recent-item-right">
                    <span className="recent-item-amount">₹{txn.amount?.toLocaleString('en-IN')}</span>
                    <StatusBadge status={txn.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Trail */}
        <div className="admin-recent-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Live Security Audit Trail</h2>
            <Link to="/admin/audit-logs" className="admin-card-link">
              View Logs <ArrowRight size={14} />
            </Link>
          </div>

          <div className="recent-items-list">
            {recentAudits.length === 0 ? (
              <p className="empty-subtext">No administrative actions logged yet</p>
            ) : (
              recentAudits.map((log, idx) => (
                <div key={idx} className="recent-item-row">
                  <div className="recent-item-left">
                    <div className="recent-item-icon audit-icon">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="recent-item-primary">{log.action.replace(/_/g, ' ')}</p>
                      <p className="recent-item-secondary">
                        {log.admin?.name || 'Admin'} on {log.targetModel} {log.targetName ? `(${log.targetName})` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="recent-item-right">
                    <span className="recent-item-time">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
