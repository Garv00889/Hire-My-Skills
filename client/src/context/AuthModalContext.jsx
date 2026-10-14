import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginRequiredModal from '../components/LoginRequiredModal';

const AuthModalContext = createContext(null);

export const AuthModalProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: 'Login Required',
    message: 'You need to be logged in to access this feature. Sign in or create an account to get started.',
    redirectTo: '/home',
  });

  const openLoginModal = useCallback((options = {}) => {
    setModalConfig({
      isOpen: true,
      title: options.title || 'Login Required',
      message: options.message || 'You need to be logged in to access this feature. Sign in or create an account to get started.',
      redirectTo: options.redirectTo || '/home',
    });
  }, []);

  const closeLoginModal = useCallback(() => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // When a user tries to access a restricted route, ProtectedRoute redirects them to /
  // with state { requireLogin: true, from: location.pathname }. We show the popup here.
  useEffect(() => {
    if (location.state?.requireLogin && !user) {
      setModalConfig({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to access this feature. Sign in or create an account to get started.',
        redirectTo: location.state.from || '/home',
      });
      // Clear the state flag so refresh or further navigation doesn't reopen it
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, user, location.pathname, navigate]);

  return (
    <AuthModalContext.Provider value={{ openLoginModal, closeLoginModal }}>
      {children}
      {modalConfig.isOpen && (
        <LoginRequiredModal
          title={modalConfig.title}
          message={modalConfig.message}
          redirectTo={modalConfig.redirectTo}
          onClose={closeLoginModal}
        />
      )}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};
