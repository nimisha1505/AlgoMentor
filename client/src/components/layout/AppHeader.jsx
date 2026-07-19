import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal } from 'lucide-react';

/**
 * Redesigned AppHeader for guest public views.
 */
const AppHeader = () => {
  const navigate = useNavigate();

  const handleAnchorClick = (e, targetId) => {
    e.preventDefault();
    // If on homepage, scroll. Otherwise navigate home with hash
    if (window.location.pathname === '/') {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${targetId}`);
    }
  };

  return (
    <header className="app-header">
      <div className="header-container site-container">
        <Link to="/" className="brand-link">
          <Terminal size={18} className="brand-icon" />
          <span className="brand-name">AlgoMentor</span>
        </Link>

        <nav className="public-nav-links">
          <a
            href="#how-it-works"
            onClick={(e) => handleAnchorClick(e, 'how-it-works')}
            className="public-nav-link"
          >
            How It Works
          </a>
          <a
            href="#features"
            onClick={(e) => handleAnchorClick(e, 'features')}
            className="public-nav-link"
          >
            Features
          </a>
          <Link to="/login" className="public-nav-link">
            Login
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            Start Learning
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
export { AppHeader };
