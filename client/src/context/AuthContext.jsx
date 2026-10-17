import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('hms_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('hms_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem('hms_token');
      const storedUser = localStorage.getItem('hms_user');

      if (!storedToken || !storedUser) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      // Verify token is still valid against server
      try {
        const res = await getMe();
        if (res.data) {
          setUser(res.data);
          setToken(storedToken);
          localStorage.setItem('hms_user', JSON.stringify(res.data));
        }
      } catch (err) {
        // Only clear credentials if the server explicitly rejects the token (401/403)
        // If it's a network drop, timeout, or backend cold start, do NOT log the user out!
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('hms_token');
          localStorage.removeItem('hms_user');
          setUser(null);
          setToken(null);
        }
      } finally {
        setLoading(false);
      }
    };

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('hms_auth_unauthorized', handleUnauthorized);

    validateSession();

    return () => {
      window.removeEventListener('hms_auth_unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('hms_user', JSON.stringify(userData));
    localStorage.setItem('hms_token', authToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hms_user');
    localStorage.removeItem('hms_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
