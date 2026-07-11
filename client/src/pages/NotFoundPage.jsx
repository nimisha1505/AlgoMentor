import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Home } from 'lucide-react';

/**
 * Fallback page shown for non-matching URLs.
 */
const NotFoundPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-desc">
          The requested page could not be located on AlgoMentor.
        </p>
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          className="btn btn-primary not-found-link"
        >
          <Home size={16} className="home-icon" />
          <span>Back to {isAuthenticated ? 'Dashboard' : 'Home'}</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
export { NotFoundPage };
