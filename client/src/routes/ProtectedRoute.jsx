import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Loader from '../components/common/Loader.jsx';

/**
 * Route guard that prevents unauthenticated users from accessing protected workspace pages.
 * Redirects guests to the LoginPage while preserving their target URL in location state.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="auth-loader-wrapper">
        <Loader text="Verifying session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login and save the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
export { ProtectedRoute };
