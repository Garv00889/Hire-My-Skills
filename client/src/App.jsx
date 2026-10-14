import ReviewApplicationsPage from './pages/ReviewApplicationsPage';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthModalProvider } from './context/AuthModalContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import CreateProjectPage from './pages/CreateProjectPage';
import ExploreProjectsPage from './pages/ExploreProjectsPage';
import ChatPage from './pages/ChatPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import DeclinedRequestsPage from './pages/DeclinedRequestsPage';
import AdminLayout from './admin/layouts/AdminLayout';
import AdminRoute from './admin/routes/AdminRoute';
import AdminDashboardPage from './admin/pages/AdminDashboardPage';
import AdminUsersPage from './admin/pages/AdminUsersPage';
import AdminProjectsPage from './admin/pages/AdminProjectsPage';
import AdminProposalsPage from './admin/pages/AdminProposalsPage';
import AdminReadyMadePage from './admin/pages/AdminReadyMadePage';
import AdminTransactionsPage from './admin/pages/AdminTransactionsPage';
import AdminCommissionsPage from './admin/pages/AdminCommissionsPage';
import AdminPayoutsPage from './admin/pages/AdminPayoutsPage';
import AdminRefundsPage from './admin/pages/AdminRefundsPage';
import AdminReviewsPage from './admin/pages/AdminReviewsPage';
import AdminTicketsPage from './admin/pages/AdminTicketsPage';
import AdminAnnouncementsPage from './admin/pages/AdminAnnouncementsPage';
import AdminAuditLogsPage from './admin/pages/AdminAuditLogsPage';
import AdminRolesPage from './admin/pages/AdminRolesPage';
import AdminSettingsPage from './admin/pages/AdminSettingsPage';
import './index.css';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #F5A623', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return user ? children : <Navigate to="/" state={{ requireLogin: true, from: location.pathname }} replace />;
};

// Public route wrapper (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const from = location.state?.from || '/home';
  return user ? <Navigate to={from} replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
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
