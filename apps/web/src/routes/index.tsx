import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ServerView from '../pages/ServerView';
import DMView from '../pages/DMView';
import OnboardingPage from '../pages/OnboardingPage';
import DashboardPage from '../pages/DashboardPage';
import WorkspacesPage from '../pages/workspaces/WorkspacesPage';
import SettingsPage from '../pages/settings/SettingsPage';
import IntegrationSettingsPage from '../pages/settings/IntegrationSettingsPage';

function ProtectedRoute({ children, allowOnboarding = false }: { children: JSX.Element; allowOnboarding?: boolean }) {
  const { user, status, hydrate } = useAuthStore();
  const location = useLocation();
  useEffect(() => {
    if (status === 'idle') hydrate();
  }, [status, hydrate]);

  if (status === 'idle' || status === 'loading') {
    return <div className="h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.onboarded && !allowOnboarding) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  if (user.onboarded && allowOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute allowOnboarding>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workspaces" element={<WorkspacesPage />} />
        <Route path="servers/:serverId/channels/:channelId" element={<ServerView />} />
        <Route path="dms/:threadId" element={<DMView />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/integrations" element={<IntegrationSettingsPage />} />
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
