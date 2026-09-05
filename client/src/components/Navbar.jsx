import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Bell, MessageSquare, Info, ChevronDown, LogOut, User, UserX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './Navbar.css';

// Navbar reads unread count from global NotificationContext — no prop needed
const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>

      {/* Logo */}
      <Link to="/home" className="nav-logo">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="3" fill="#F5A623" />
          <rect x="18" y="2" width="12" height="12" rx="3" fill="#F5A623" opacity="0.5" />
          <rect x="2" y="18" width="12" height="12" rx="3" fill="#F5A623" opacity="0.5" />
          <rect x="18" y="18" width="12" height="12" rx="3" fill="#F5A623" />
        </svg>
        <span>HireMySkills</span>
      </Link>

      {/* Center Navigation Pills */}
      <div className="nav-center" role="navigation">
        <Link id="nav-home" to="/home" className={`nav-pill ${isActive('/home') ? 'active' : ''}`} title="Home">
          <Home size={18} />
        </Link>

        {/* Explore Projects */}
        <Link id="nav-explore" to="/explore" className={`nav-pill ${isActive('/explore') ? 'active' : ''}`} title="Explore Projects">
          <Compass size={18} />
        </Link>

        {/* Bell icon — badge driven by global NotificationContext */}
        <Link id="nav-notifications" to="/notifications" className={`nav-pill ${isActive('/notifications') ? 'active' : ''}`} title="Notifications">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </Link>

        <Link id="nav-chat" to="/chat" className={`nav-pill ${location.pathname.startsWith('/chat') ? 'active' : ''}`} title="Team Chat">
          <MessageSquare size={18} />
        </Link>

        <Link id="nav-about" to="/about" className={`nav-pill ${isActive('/about') ? 'active' : ''}`} title="About">
          <Info size={18} />
        </Link>
      </div>

      {/* Right — User Profile Dropdown */}
      <div className="nav-profile" ref={dropRef}>
        <button id="nav-profile-btn" className="profile-trigger" onClick={() => setDropOpen(!dropOpen)}>
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
              <div className="avatar avatar-lg">{initials}</div>
              <div>
                <p className="fw-600" style={{ fontSize: 14 }}>{user?.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
            </div>
            <div className="dropdown-divider" />
            <Link to="/profile" className="dropdown-item" onClick={() => setDropOpen(false)}>
              <User size={15} /> My Profile
            </Link>
            <Link to="/declined-requests" className="dropdown-item" onClick={() => setDropOpen(false)}>
              <UserX size={15} /> Declined Requests (7-Day)
            </Link>
            <button id="nav-logout" className="dropdown-item danger" onClick={handleLogout}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
