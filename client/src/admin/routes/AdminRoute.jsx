import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Sparkles, Home } from 'lucide-react';
import { seedAdminData } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [promoting, setPromoting] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8F7F4' }}>
        <div style={{ width: 44, height: 44, border: '3px solid #F5A623', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const allowedRoles = ['admin', 'superadmin', 'moderator', 'support'];
  const hasAccess = allowedRoles.includes(user.role);

  if (!hasAccess) {
    const handlePromoteSelf = async () => {
      try {
        setPromoting(true);
        const res = await seedAdminData();
        toast.success('Your account has been granted SuperAdmin privileges!');
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to grant admin access');
      } finally {
        setPromoting(false);
      }
    };

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8F7F4',
        padding: '24px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E8E5DF',
          borderRadius: '20px',
          padding: '40px 32px',
          maxWidth: '480px',
          textAlign: 'center',
          boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 10px' }}>
            Restricted Admin Area
          </h2>

          <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 24px' }}>
            Your account (<strong>{user.email}</strong>) currently has the role of <strong>{user.role}</strong>. Administrative privileges are required to access this portal.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handlePromoteSelf}
              disabled={promoting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: '#F5A623',
                color: '#111827',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <Sparkles size={16} />
              {promoting ? 'Enabling SuperAdmin...' : 'Enable SuperAdmin Access (Dev/Demo)'}
            </button>

            <a
              href="/home"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 20px',
                background: '#F3F4F6',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              <Home size={16} /> Return to Marketplace
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
