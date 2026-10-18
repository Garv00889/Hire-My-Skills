import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Bell, MessageSquare, Info, ChevronDown, LogOut, User, UserX, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuthModal } from '../context/AuthModalContext';
import { prefetchRoute } from '../App';
import BrandLogo from './BrandLogo';
import './Navbar.css';

// Navbar reads unread count from global NotificationContext — no prop needed
const Navbar = () => {
  const { user, logout } = useAuth();
  const { openLoginModal } = useAuthModal();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu and dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const dropRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const handleRestrictedClick = (e, path) => {
    if (!user) {
      e.preventDefault();
      setMobileMenuOpen(false);
      openLoginModal({
        redirectTo: path,
        message: path.startsWith('/chat')
          ? 'You need to be logged in to access team chat. Sign in or create an account to get started.'
          : 'You need to be logged in to view your notifications. Sign in or create an account to get started.',
      });
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>

      {/* Logo */}
      <Link to="/home" className="nav-logo" onMouseEnter={() => prefetchRoute('Explore')}>
        <BrandLogo size={28} />
        <span>HireMySkills</span>
      </Link>

      {/* Center Navigation Pills */}
      <div className="nav-center" role="navigation">
        <Link id="nav-home" to="/home" className={`nav-pill ${isActive('/home') ? 'active' : ''}`} title="Home" onMouseEnter={() => prefetchRoute('Explore')}>
          <Home size={18} />
        </Link>

        {/* Explore Projects */}
        <Link
          id="nav-explore"
          to="/explore"
          className={`nav-pill ${isActive('/explore') ? 'active' : ''}`}
          title="Explore Projects"
          onMouseEnter={() => prefetchRoute('Explore')}
          onTouchStart={() => prefetchRoute('Explore')}
        >
          <Compass size={18} />
        </Link>

        {/* Bell icon — badge driven by global NotificationContext */}
        <Link
          id="nav-notifications"
          to="/notifications"
          className={`nav-pill ${isActive('/notifications') ? 'active' : ''}`}
          title="Notifications"
          onMouseEnter={() => prefetchRoute('Notifications')}
          onTouchStart={() => prefetchRoute('Notifications')}
          onClick={(e) => handleRestrictedClick(e, '/notifications')}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </Link>

        <Link
          id="nav-chat"
          to="/chat"
          className={`nav-pill ${location.pathname.startsWith('/chat') ? 'active' : ''}`}
          title="Team Chat"
          onMouseEnter={() => prefetchRoute('Chat')}
          onTouchStart={() => prefetchRoute('Chat')}
          onClick={(e) => handleRestrictedClick(e, '/chat')}
        >
          <MessageSquare size={18} />
        </Link>

        <Link
          id="nav-about"
          to="/about"
          className={`nav-pill ${isActive('/about') ? 'active' : ''}`}
          title="About"
          onMouseEnter={() => prefetchRoute('About')}
          onTouchStart={() => prefetchRoute('About')}
        >
          <Info size={18} />
        </Link>
      </div>

      {/* Right — Desktop Profile & Mobile Hamburger */}
      <div className="nav-right-area">
        {/* Desktop User Profile Dropdown or Auth Buttons */}
        {user ? (
          <div className="nav-profile desktop-only" ref={dropRef}>
            <button id="nav-profile-btn" className="profile-trigger" onClick={() => setDropOpen(!dropOpen)} aria-label="User menu">
              <div className="avatar">
                {user?.profilePicture
                  ? <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials
                }
              </div>
              <ChevronDown
                size={15}
                color="var(--text-secondary)"
                style={{
                  transition: 'transform .35s ease',
                  transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {dropOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="avatar avatar-lg">
                    {user?.profilePicture
                      ? <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : initials
                    }
                  </div>
                  <div>
                    <p className="fw-600" style={{ fontSize: 14 }}>{user?.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</p>
                  </div>
                </div>
                <div className="dropdown-divider" />
                {['admin', 'superadmin', 'moderator', 'support'].includes(user?.role) && (
                  <Link to="/admin" className="dropdown-item" onClick={() => setDropOpen(false)} style={{ color: '#D4891A', fontWeight: 600 }}>
                    <ShieldCheck size={15} color="#F5A623" /> Admin Portal
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="dropdown-item"
                  onClick={() => setDropOpen(false)}
                  onMouseEnter={() => prefetchRoute('Profile')}
                  onTouchStart={() => prefetchRoute('Profile')}
                >
                  <User size={15} /> My Profile
                </Link>
                <Link
                  to="/declined-requests"
                  className="dropdown-item"
                  onClick={() => setDropOpen(false)}
                  onMouseEnter={() => prefetchRoute('Declined')}
                  onTouchStart={() => prefetchRoute('Declined')}
                >
                  <UserX size={15} /> Declined Requests (7-Day)
                </Link>
                <button id="nav-logout" className="dropdown-item danger" onClick={handleLogout}>
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              to="/login"
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onMouseEnter={() => prefetchRoute('Login')}
              onTouchStart={() => prefetchRoute('Login')}
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onMouseEnter={() => prefetchRoute('Signup')}
              onTouchStart={() => prefetchRoute('Signup')}
            >
              Sign Up
            </Link>
          </div>
        )}

        {/* Mobile Action Buttons (Visible only on <= 768px) */}
        <div className="nav-mobile-actions mobile-only">
          {/* Quick notification bell for mobile */}
          <Link
            to="/notifications"
            className={`mobile-quick-bell ${isActive('/notifications') ? 'active' : ''}`}
            aria-label="Notifications"
            onTouchStart={() => prefetchRoute('Notifications')}
            onClick={(e) => handleRestrictedClick(e, '/notifications')}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </Link>

          {/* Hamburger Menu Toggle Button */}
          <button
            id="mobile-menu-toggle"
            className={`mobile-hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="mobile-nav-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Mobile Navigation"
          >
            {/* User Profile Header in Mobile Drawer */}
            {user ? (
              <div className="mobile-user-card">
                <div className="avatar avatar-lg">
                  {user?.profilePicture
                    ? <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : initials
                  }
                </div>
                <div className="mobile-user-info">
                  <p className="mobile-user-name">{user?.name}</p>
                  <p className="mobile-user-email">{user?.email}</p>
                </div>
              </div>
            ) : (
              <div className="mobile-auth-prompt">
                <Link
                  to="/login"
                  className="btn-primary"
                  style={{ width: '100%' }}
                  onTouchStart={() => prefetchRoute('Login')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn-secondary"
                  style={{ width: '100%' }}
                  onTouchStart={() => prefetchRoute('Signup')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}

            <div className="mobile-drawer-divider" />

            {/* Primary Navigation Links */}
            <div className="mobile-nav-links">
              <span className="mobile-section-heading">Navigation</span>

              <Link
                to="/home"
                className={`mobile-nav-item ${isActive('/home') ? 'active' : ''}`}
                onTouchStart={() => prefetchRoute('Explore')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="mobile-nav-icon"><Home size={18} /></div>
                <span>Home</span>
                <ArrowRight size={14} className="mobile-item-arrow" />
              </Link>

              <Link
                to="/explore"
                className={`mobile-nav-item ${isActive('/explore') ? 'active' : ''}`}
                onTouchStart={() => prefetchRoute('Explore')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="mobile-nav-icon"><Compass size={18} /></div>
                <span>Explore Projects</span>
                <ArrowRight size={14} className="mobile-item-arrow" />
              </Link>

              <Link
                to="/notifications"
                className={`mobile-nav-item ${isActive('/notifications') ? 'active' : ''}`}
                onTouchStart={() => prefetchRoute('Notifications')}
                onClick={(e) => {
                  if (!user) {
                    handleRestrictedClick(e, '/notifications');
                  } else {
                    setMobileMenuOpen(false);
                  }
                }}
              >
                <div className="mobile-nav-icon">
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="mobile-item-badge">{unreadCount}</span>}
                </div>
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <span className="mobile-unread-pill">{unreadCount} new</span>
                ) : (
                  <ArrowRight size={14} className="mobile-item-arrow" />
                )}
              </Link>

              <Link
                to="/chat"
                className={`mobile-nav-item ${location.pathname.startsWith('/chat') ? 'active' : ''}`}
                onTouchStart={() => prefetchRoute('Chat')}
                onClick={(e) => {
                  if (!user) {
                    handleRestrictedClick(e, '/chat');
                  } else {
                    setMobileMenuOpen(false);
                  }
                }}
              >
                <div className="mobile-nav-icon"><MessageSquare size={18} /></div>
                <span>Team Chat</span>
                <ArrowRight size={14} className="mobile-item-arrow" />
              </Link>

              <Link
                to="/about"
                className={`mobile-nav-item ${isActive('/about') ? 'active' : ''}`}
                onTouchStart={() => prefetchRoute('About')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="mobile-nav-icon"><Info size={18} /></div>
                <span>About</span>
                <ArrowRight size={14} className="mobile-item-arrow" />
              </Link>
            </div>

            {/* Account & Profile Links */}
            {user && (
              <>
                <div className="mobile-drawer-divider" />
                <div className="mobile-nav-links">
                  <span className="mobile-section-heading">Account</span>

                  {['admin', 'superadmin', 'moderator', 'support'].includes(user?.role) && (
                    <Link
                      to="/admin"
                      className={`mobile-nav-item ${isActive('/admin') ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{ background: 'rgba(245, 166, 35, 0.1)', color: '#D4891A', fontWeight: 600 }}
                    >
                      <div className="mobile-nav-icon"><ShieldCheck size={18} color="#F5A623" /></div>
                      <span>Admin Portal</span>
                      <ArrowRight size={14} className="mobile-item-arrow" />
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    className={`mobile-nav-item ${isActive('/profile') ? 'active' : ''}`}
                    onTouchStart={() => prefetchRoute('Profile')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="mobile-nav-icon"><User size={18} /></div>
                    <span>My Profile</span>
                    <ArrowRight size={14} className="mobile-item-arrow" />
                  </Link>

                  <Link
                    to="/declined-requests"
                    className={`mobile-nav-item ${isActive('/declined-requests') ? 'active' : ''}`}
                    onTouchStart={() => prefetchRoute('Declined')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="mobile-nav-icon"><UserX size={18} /></div>
                    <span>Declined Requests (7-Day)</span>
                    <ArrowRight size={14} className="mobile-item-arrow" />
                  </Link>

                  <button
                    className="mobile-nav-item danger"
                    onClick={handleLogout}
                  >
                    <div className="mobile-nav-icon"><LogOut size={18} /></div>
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
