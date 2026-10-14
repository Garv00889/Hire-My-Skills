import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, X } from 'lucide-react';
import './LoginRequiredModal.css';

const LoginRequiredModal = ({
  onClose,
  title = 'Login Required',
  message = 'You need to be logged in to access this feature. Sign in or create an account to get started.',
  redirectTo = '/home',
}) => {
  const navigate = useNavigate();

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleLogin = () => {
    onClose();
    navigate('/login', { state: { from: redirectTo } });
  };

  const handleSignup = () => {
    onClose();
    navigate('/signup', { state: { from: redirectTo } });
  };

  return (
    <div
      className="login-required-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="login-required-modal" onClick={(e) => e.stopPropagation()}>
        <button className="lrm-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="lrm-icon">
          <LogIn size={28} color="var(--gold)" />
        </div>

        <h2 className="lrm-title">{title}</h2>
        <p className="lrm-desc">{message}</p>

        <div className="lrm-actions">
          <button className="lrm-btn-login" onClick={handleLogin}>
            Log In
          </button>
          <button className="lrm-btn-signup" onClick={handleSignup}>
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal;
