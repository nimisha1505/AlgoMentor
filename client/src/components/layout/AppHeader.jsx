import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { LogOut, User, Terminal } from 'lucide-react';

/**
 * Top navigation header component. Handles showing brand logo,
 * guest paths (Login/Register), and authenticated user status (name, logout).
 */
const AppHeader = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="app-header">
      <div className="header-container container">
        <NavLink
          to={isAuthenticated ? '/dashboard' : '/'}
          className="brand-link"
        >
          <Terminal size={22} className="brand-icon" />
          <span className="brand-name">AlgoMentor</span>
        </NavLink>
        <nav className="header-nav">
          {isAuthenticated ? (
            <div className="nav-user-controls">
              <span className="user-greeting">
                <User size={16} className="user-icon" />
                <span className="username-text">
                  {user?.fullName || user?.username}
                </span>
              </span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="logout-btn"
              >
                <LogOut size={16} className="logout-icon" />
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          ) : (
            <div className="nav-auth-links">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                Sign In
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  isActive ? 'nav-link active register-btn' : 'nav-link register-btn'
                }
              >
                Register
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
export { AppHeader };
