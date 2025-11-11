import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function AuthLayout() {
  const { user, status } = useAuthStore();
  if (status === 'authenticated' && user) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-white">
      <div className="w-full max-w-md rounded-xl bg-sidebar p-8 shadow-2xl">
        <Outlet />
      </div>
    </div>
  );
}
