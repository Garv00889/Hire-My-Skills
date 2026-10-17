import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthModalProvider } from './context/AuthModalContext';
import { useGlobalScrollReveal } from './hooks/useScrollReveal';
import HomePage from './pages/HomePage';
import './index.css';

// Lazy-loaded consumer routes
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage'));
const ExploreProjectsPage = lazy(() => import('./pages/ExploreProjectsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const DeclinedRequestsPage = lazy(() => import('./pages/DeclinedRequestsPage'));
const ReviewApplicationsPage = lazy(() => import('./pages/ReviewApplicationsPage'));

// Lazy-loaded admin routes
const AdminLayout = lazy(() => import('./admin/layouts/AdminLayout'));
const AdminRoute = lazy(() => import('./admin/routes/AdminRoute'));
const AdminDashboardPage = lazy(() => import('./admin/pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./admin/pages/AdminUsersPage'));
const AdminProjectsPage = lazy(() => import('./admin/pages/AdminProjectsPage'));
const AdminProposalsPage = lazy(() => import('./admin/pages/AdminProposalsPage'));
const AdminReadyMadePage = lazy(() => import('./admin/pages/AdminReadyMadePage'));
const AdminTransactionsPage = lazy(() => import('./admin/pages/AdminTransactionsPage'));
const AdminCommissionsPage = lazy(() => import('./admin/pages/AdminCommissionsPage'));
const AdminPayoutsPage = lazy(() => import('./admin/pages/AdminPayoutsPage'));
const AdminRefundsPage = lazy(() => import('./admin/pages/AdminRefundsPage'));
const AdminReviewsPage = lazy(() => import('./admin/pages/AdminReviewsPage'));
const AdminTicketsPage = lazy(() => import('./admin/pages/AdminTicketsPage'));
const AdminAnnouncementsPage = lazy(() => import('./admin/pages/AdminAnnouncementsPage'));
const AdminAuditLogsPage = lazy(() => import('./admin/pages/AdminAuditLogsPage'));
const AdminRolesPage = lazy(() => import('./admin/pages/AdminRolesPage'));
const AdminSettingsPage = lazy(() => import('./admin/pages/AdminSettingsPage'));

// High-performance branded PageLoader fallback
const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    width: '100%',
    gap: '16px',
    animation: 'hmsFadeIn 0.25s ease-out forwards',
  }}>
    <div style={{
      width: '42px',
      height: '42px',
      border: '3px solid rgba(245, 166, 35, 0.2)',
      borderTopColor: '#F5A623',
      borderRadius: '50%',
      animation: 'spin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
    }} />
  </div>
);

// Protected route wrapper: redirects unauthorized visitors to login with return path
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #F5A623', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return user ? children : <Navigate to="/login" state={{ from: location.pathname }} replace />;
};

// Public route wrapper (redirect if logged in, unless processing OAuth callback)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const hasAuthParams = searchParams.has('token') || searchParams.has('error');
  const rawFrom = location.state?.from;
  const from = (rawFrom && rawFrom !== '/login' && rawFrom !== '/signup') ? rawFrom : '/home';

  if (user && !hasAuthParams) {
    return <Navigate to={from} replace />;
  }
  return children;
};

function AppRoutes() {
  // Attach global observer for scroll-triggered reveal elements
  useGlobalScrollReveal();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><LoginPage showForgotModalInitial /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/create-project" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
      <Route path="/explore" element={<ExploreProjectsPage />} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/chat/:projectId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/declined-requests" element={<ProtectedRoute><DeclinedRequestsPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/applications" element={<ProtectedRoute><ReviewApplicationsPage /></ProtectedRoute>} />

      {/* Admin Panel Portal Routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="user" element={<Navigate to="/admin/users" replace />} />
        <Route path="students" element={<AdminUsersPage defaultRole="student" />} />
        <Route path="student" element={<Navigate to="/admin/students" replace />} />
        <Route path="clients" element={<AdminUsersPage defaultRole="client" />} />
        <Route path="client" element={<Navigate to="/admin/clients" replace />} />
        <Route path="projects" element={<AdminProjectsPage />} />
        <Route path="project" element={<AdminProjectsPage />} />
        <Route path="projects/:id" element={<AdminProjectsPage />} />
        <Route path="project/:id" element={<AdminProjectsPage />} />
        <Route path="proposals" element={<AdminProposalsPage />} />
        <Route path="proposal" element={<Navigate to="/admin/proposals" replace />} />
        <Route path="ready-made-projects" element={<AdminReadyMadePage />} />
        <Route path="ready-made-project" element={<Navigate to="/admin/ready-made-projects" replace />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
        <Route path="transaction" element={<Navigate to="/admin/transactions" replace />} />
        <Route path="commissions" element={<AdminCommissionsPage />} />
        <Route path="commission" element={<Navigate to="/admin/commissions" replace />} />
        <Route path="payouts" element={<AdminPayoutsPage />} />
        <Route path="payout" element={<Navigate to="/admin/payouts" replace />} />
        <Route path="refunds" element={<AdminRefundsPage />} />
        <Route path="refund" element={<Navigate to="/admin/refunds" replace />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="review" element={<Navigate to="/admin/reviews" replace />} />
        <Route path="tickets" element={<AdminTicketsPage />} />
        <Route path="ticket" element={<Navigate to="/admin/tickets" replace />} />
        <Route path="announcements" element={<AdminAnnouncementsPage />} />
        <Route path="announcement" element={<Navigate to="/admin/announcements" replace />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="audit-log" element={<Navigate to="/admin/audit-logs" replace />} />
        <Route path="roles" element={<AdminRolesPage />} />
        <Route path="role" element={<Navigate to="/admin/roles" replace />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="setting" element={<Navigate to="/admin/settings" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AuthModalProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#fff',
                  color: '#1A1A1A',
                  borderRadius: '12px',
                  border: '1px solid #E8E5DF',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                },
                success: { iconTheme: { primary: '#F5A623', secondary: '#fff' } },
              }}
            />
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </AuthModalProvider>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
