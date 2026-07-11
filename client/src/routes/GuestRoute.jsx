import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Loader from '../components/common/Loader.jsx';

/**
 * Route guard that prevents authenticated users from accessing login and registration routes.
 * Redirects authenticated users directly to their DashboardPage.
 */
const GuestRoute = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="auth-loader-wrapper">
        <Loader text="Verifying session..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default GuestRoute;
export { GuestRoute };
