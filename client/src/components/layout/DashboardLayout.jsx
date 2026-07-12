import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Terminal, LayoutDashboard, PlusCircle, Database, LogOut, Menu, X, RefreshCw, Settings } from 'lucide-react';

/**
 * Redesigned DashboardLayout. Features a slim fixed sidebar on desktop
 * and responsive navigation toggles on mobile viewport sizes.
 */
const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const getInitials = () => {
    if (user?.fullName) {
      return user.fullName[0].toUpperCase();
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="layout-wrapper dashboard-layout">
      {/* Desktop Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <Terminal size={18} className="brand-icon" />
            <span>AlgoMentor</span>
          </div>

          <nav className="sidebar-nav">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </NavLink>
            <NavLink
              to="/problems/new"
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <PlusCircle size={16} />
              <span>Analyse</span>
            </NavLink>
            <NavLink
              to="/problems"
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <Database size={16} />
              <span>My Problems</span>
            </NavLink>
            <NavLink
              to="/revise"
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <RefreshCw size={16} />
              <span>Revise Today</span>
            </NavLink>
            <NavLink
              to="/preferences"
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <Settings size={16} />
              <span>Preferences</span>
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="user-sidebar-profile">
            <div className="sidebar-avatar">{getInitials()}</div>
            <span className="sidebar-username" title={user?.fullName || user?.username}>
              {user?.fullName || user?.username}
            </span>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="logout-btn-secondary"
            title="Logout"
            aria-label="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="mobile-top-bar">
        <div className="mobile-header-left" style={{ display: 'flex', alignItems: 'center' }}>
          <Terminal size={18} className="brand-icon" />
          <span style={{ fontWeight: '700', fontSize: '14px', marginLeft: '6px' }}>AlgoMentor</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-menu">
          <NavLink
            to="/dashboard"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            <LayoutDashboard size={16} />
            <span>Overview</span>
          </NavLink>
          <NavLink
            to="/problems/new"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            <PlusCircle size={16} />
            <span>Analyse</span>
          </NavLink>
          <NavLink
            to="/problems"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            <Database size={16} />
            <span>My Problems</span>
          </NavLink>
          <NavLink
            to="/revise"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            <RefreshCw size={16} />
            <span>Revise Today</span>
          </NavLink>
          <NavLink
            to="/preferences"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            <Settings size={16} />
            <span>Preferences</span>
          </NavLink>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>{user?.fullName || user?.username}</span>
            <button onClick={handleLogout} disabled={isLoggingOut} className="logout-btn-secondary" style={{ padding: '4px' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Main content wrapper */}
      <main className="dashboard-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
