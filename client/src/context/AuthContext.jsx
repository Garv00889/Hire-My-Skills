import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem('hms_token');
      const storedUser = localStorage.getItem('hms_user');

      if (!storedToken || !storedUser) {
        setLoading(false);
        return;
      }

      // Verify token is still valid against server
      try {
        const res = await getMe();
        setUser(res.data);
        setToken(storedToken);
      } catch (err) {
        // Token invalid or user deleted — clear localStorage
        localStorage.removeItem('hms_token');
        localStorage.removeItem('hms_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('hms_user', JSON.stringify(userData));
    localStorage.setItem('hms_token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hms_user');
    localStorage.removeItem('hms_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
