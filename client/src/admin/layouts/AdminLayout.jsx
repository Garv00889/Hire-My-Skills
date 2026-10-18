import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  FolderGit2,
  FileText,
  ShoppingBag,
  CreditCard,
  Percent,
  ArrowDownToLine,
  RotateCcw,
  Star,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  UserCog,
  Settings,
  ExternalLink,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { seedAdminData } from '../services/adminApi';
import toast from 'react-hot-toast';
import BrandLogo from '../../components/BrandLogo';
import './AdminLayout.css';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const res = await seedAdminData();
      toast.success(res.data.message || 'Sample data initialized!');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to seed sample data');
    } finally {
      setSeeding(false);
    }
  };

  const navSections = [
    {
      label: 'Overview',
      items: [
        { path: '/admin', exact: true, label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'User Management',
      items: [
        { path: '/admin/users', label: 'All Users', icon: Users },
        { path: '/admin/students', label: 'Students', icon: GraduationCap },
        { path: '/admin/clients', label: 'Clients', icon: Briefcase },
      ],
    },
    {
      label: 'Marketplace',
      items: [
        { path: '/admin/projects', label: 'Projects', icon: FolderGit2 },
        { path: '/admin/proposals', label: 'Proposals & Bids', icon: FileText },
        { path: '/admin/ready-made-projects', label: 'Ready-Made Projects', icon: ShoppingBag },
      ],
    },
    {
      label: 'Finance & Payments',
      items: [
        { path: '/admin/transactions', label: 'Transactions', icon: CreditCard },
        { path: '/admin/commissions', label: 'Commission Rates', icon: Percent },
        { path: '/admin/payouts', label: 'Payout Requests', icon: ArrowDownToLine },
        { path: '/admin/refunds', label: 'Refunds & Disputes', icon: RotateCcw },
      ],
    },
    {
      label: 'Moderation & Support',
      items: [
        { path: '/admin/reviews', label: 'Reviews & Ratings', icon: Star },
        { path: '/admin/tickets', label: 'Complaints & Tickets', icon: LifeBuoy },
        { path: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      ],
    },
    {
      label: 'System & Security',
      items: [
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
        { path: '/admin/roles', label: 'Admin Roles & Staff', icon: UserCog },
        { path: '/admin/settings', label: 'Platform Settings', icon: Settings },
      ],
    },
  ];

  const isItemActive = (item) => {
    if (item.exact) {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    if (item.path === '/admin/projects') {
      return location.pathname.startsWith('/admin/projects') || location.pathname.startsWith('/admin/project');
    }
    if (item.path === '/admin/users') {
      return location.pathname.startsWith('/admin/users') || location.pathname === '/admin/user';
    }
    return location.pathname.startsWith(item.path);
  };

  const getPageTitle = () => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (isItemActive(item)) return item.label;
      }
    }
    return 'Admin Panel';
  };

  return (
    <div className="admin-root">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="admin-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Admin Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-brand">
            <BrandLogo size={28} />
            <div className="admin-brand-text">
              <span className="admin-brand-name">HireMySkills</span>
              <span className="admin-portal-badge">ADMIN PORTAL</span>
            </div>
          </Link>

          <button
            className="admin-sidebar-close-btn mobile-only"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="admin-sidebar-nav">
          {navSections.map((sec, sIdx) => (
            <div key={sIdx} className="admin-nav-group">
              <span className="admin-nav-group-title">{sec.label}</span>
              <div className="admin-nav-group-items">
                {sec.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);
                  return (
                    <Link
                      key={iIdx}
                      to={item.path}
                      className={`admin-nav-link ${active ? 'active' : ''}`}
                    >
                      <Icon size={18} className="admin-nav-icon" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <Link to="/home" className="admin-exit-link" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            <span>Open Marketplace</span>
          </Link>

          <div className="admin-user-card">
            <div className="admin-avatar">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="admin-user-details">
              <span className="admin-user-name">{user?.name || 'Administrator'}</span>
              <span className="admin-user-role">{user?.role || 'admin'}</span>
            </div>
            <button className="admin-logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Wrapper */}
      <div className="admin-main-wrapper">
        {/* Admin Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-toggle-btn mobile-only"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="admin-breadcrumbs">
              <span className="admin-bc-root">Admin</span>
              <span className="admin-bc-separator">/</span>
              <span className="admin-bc-current">{getPageTitle()}</span>
            </div>
          </div>

          <div className="admin-topbar-right">
            {/* Seed / Demo button for instant sample records */}
            <button
              className="admin-seed-btn"
              onClick={handleSeedData}
              disabled={seeding}
              title="Populate test metrics, transactions, and ready-made projects if empty"
            >
              <Sparkles size={15} />
              <span>{seeding ? 'Seeding...' : 'Seed Data'}</span>
            </button>

            {/* Live Indicator */}
            <div className="admin-live-pill">
              <span className="admin-live-dot" />
              <span>System Live</span>
            </div>

            {/* Role Badge */}
            <div className="admin-role-pill">
              {user?.role?.toUpperCase() || 'ADMIN'}
            </div>

            {/* User Avatar */}
            <div className="admin-header-profile">
              <div className="admin-header-avatar">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <span className="admin-header-name desktop-only">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page View Body */}
        <main className="admin-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
