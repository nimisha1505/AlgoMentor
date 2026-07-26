import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { getMyProblems } from '../../api/problem.api.js';
import { getLatestProblemAnalysis } from '../../api/analysis.api.js';
import { Terminal, Home, PlusCircle, Database, LogOut, Menu, X, RefreshCw, Sliders } from 'lucide-react';

/**
 * Redesigned DashboardLayout. Features a slim fixed sidebar on desktop
 * and responsive navigation toggles on mobile viewport sizes.
 */
const DashboardLayout = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const brandDestination = isAuthenticated ? '/dashboard' : '/';
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentProblems, setRecentProblems] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch recent problems for sidebar whenever user or path changes
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const data = await getMyProblems({ limit: 5 });
        if (data && data.problems) {
          setRecentProblems(data.problems);
        }
      } catch (err) {
        console.error('Failed to fetch recent problems for sidebar:', err);
      }
    };
    if (user) {
      fetchRecent();
    }
  }, [user, location.pathname]);

  // Handle closing logout modal on Escape key press
  useEffect(() => {
    if (!showLogoutModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowLogoutModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLogoutModal]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      navigate('/');
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

  const handleRecentItemClick = async (e, problem) => {
    e.preventDefault();
    if (problem.status === 'completed') {
      try {
        const analysis = await getLatestProblemAnalysis(problem._id);
        navigate(`/analyses/${analysis._id}`);
      } catch (err) {
        navigate(`/problems/${problem._id}`);
      }
    } else {
      navigate(`/problems/${problem._id}`);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="layout-wrapper dashboard-layout">
      {/* Desktop Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo" style={{ height: '72px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--bg-sidebar-hover)' }}>
            <Link to={brandDestination} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit', width: '100%' }}>
              <Terminal size={22} className="brand-icon" style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: '600', fontSize: '17px', letterSpacing: '-0.5px', color: 'var(--text-inverse)' }}>AlgoMentor</span>
            </Link>
          </div>

          <nav className="sidebar-nav" style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <Home size={18} />
              <span>Home</span>
            </NavLink>
            <NavLink
              to="/problems/new"
              end
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <PlusCircle size={18} />
              <span>Learn a Problem</span>
            </NavLink>
            <NavLink
              to="/revise"
              end
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <RefreshCw size={18} />
              <span>Revise</span>
            </NavLink>
            <NavLink
              to="/problems"
              end
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <Database size={18} />
              <span>Saved Problems</span>
            </NavLink>
          </nav>

          {/* Recent Analyses Desktop Section */}
          <div className="sidebar-recent-section" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', display: 'block', paddingLeft: '12px' }}>
              Recent Analyses
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {recentProblems.length > 0 ? (
                recentProblems.map((prob) => {
                  const statusColor =
                    prob.status === 'completed' ? 'var(--success)' :
                    (prob.status === 'queued' || prob.status === 'processing') ? 'var(--ai-accent)' :
                    prob.status === 'failed' ? 'var(--danger)' : 'var(--text-muted)';

                  return (
                    <a
                      key={prob._id}
                      href={`/problems/${prob._id}`}
                      onClick={(e) => handleRecentItemClick(e, prob)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                        borderRadius: '9px',
                        transition: 'all 0.15s ease'
                      }}
                      className="sidebar-recent-link"
                      title={prob.title}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }}></span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {prob.title}
                      </span>
                    </a>
                  );
                })
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '12px', fontStyle: 'italic' }}>
                  Your recent work will appear here.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User section remains anchored at the bottom */}
        <div className="sidebar-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--bg-sidebar-hover)', paddingTop: '16px', padding: '16px' }}>
          <NavLink
            to="/preferences"
            end
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
            style={{ width: '100%' }}
          >
            <Sliders size={18} />
            <span>Preferences</span>
          </NavLink>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
            <div className="user-sidebar-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div className="sidebar-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                {getInitials()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span className="sidebar-username" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-inverse)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user?.fullName || user?.username}>
                  {user?.fullName || user?.username}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="logout-btn-secondary"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
              title="Logout"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="mobile-top-bar">
        <Link to={brandDestination} className="mobile-header-left" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <Terminal size={18} className="brand-icon" style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: '700', fontSize: '14px', marginLeft: '6px', color: 'var(--text-inverse)' }}>AlgoMentor</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#FFFFFF' }}
          aria-label="Open mobile menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Slide-in Drawer */}
      <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
      <aside className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '72px', padding: '0 16px', borderBottom: '1px solid var(--bg-sidebar-hover)' }}>
          <Link to={brandDestination} onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            <Terminal size={22} className="brand-icon" style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: '800', fontSize: '17px', letterSpacing: '-0.5px', color: 'var(--text-inverse)' }}>AlgoMentor</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#C8D2CF' }}
            aria-label="Close mobile menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <nav className="sidebar-nav" style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <NavLink
                to="/dashboard"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link active' : 'sidebar-link'
                }
              >
                <Home size={18} />
                <span>Home</span>
              </NavLink>
              <NavLink
                to="/problems/new"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link active' : 'sidebar-link'
                }
              >
                <PlusCircle size={18} />
                <span>Learn a Problem</span>
              </NavLink>
              <NavLink
                to="/revise"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link active' : 'sidebar-link'
                }
              >
                <RefreshCw size={18} />
                <span>Revise</span>
              </NavLink>
              <NavLink
                to="/problems"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link active' : 'sidebar-link'
                }
              >
                <Database size={18} />
                <span>Saved Problems</span>
              </NavLink>
            </nav>

            {/* Recent Analyses on Mobile */}
            <div className="sidebar-recent-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', display: 'block', paddingLeft: '12px' }}>
                Recent Analyses
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {recentProblems.length > 0 ? (
                  recentProblems.map((prob) => {
                    const statusColor =
                      prob.status === 'completed' ? 'var(--success)' :
                      (prob.status === 'queued' || prob.status === 'processing') ? 'var(--ai-accent)' :
                      prob.status === 'failed' ? 'var(--danger)' : 'var(--text-muted)';

                    return (
                      <a
                        key={prob._id}
                        href={`/problems/${prob._id}`}
                        onClick={(e) => handleRecentItemClick(e, prob)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                          textDecoration: 'none',
                          borderRadius: '9px',
                          transition: 'all 0.15s ease'
                        }}
                        className="sidebar-recent-link"
                        title={prob.title}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }}></span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {prob.title}
                        </span>
                      </a>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '12px', fontStyle: 'italic' }}>
                    Your recent work will appear here.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User profile & settings on Mobile */}
          <div className="sidebar-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--bg-sidebar-hover)', paddingTop: '16px', padding: '16px 16px 0' }}>
            <NavLink
              to="/preferences"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
              style={{ width: '100%' }}
            >
              <Sliders size={18} />
              <span>Preferences</span>
            </NavLink>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
              <div className="user-sidebar-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div className="sidebar-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                  {getInitials()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span className="sidebar-username" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-inverse)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName || user?.username}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
                </div>
              </div>
              <button onClick={handleLogout} disabled={isLoggingOut} className="logout-btn-secondary" style={{ padding: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <main className="dashboard-main">
        <Outlet />
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="logout-modal-backdrop"
          onClick={() => setShowLogoutModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className="logout-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-surface, #ffffff)',
              borderRadius: 'var(--radius-md, 12px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: '400px',
              padding: '24px',
              border: '1px solid var(--border, #E2EFE7)',
              margin: '16px',
            }}
          >
            <h2
              id="logout-title"
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary, #1C2E24)',
                margin: '0 0 12px 0',
              }}
            >
              Log out?
            </h2>
            <p
              id="logout-desc"
              style={{
                fontSize: '14.5px',
                color: 'var(--text-secondary, #4A5D4E)',
                margin: '0 0 24px 0',
                lineHeight: '1.5',
              }}
            >
              Are you sure you want to log out of AlgoMentor?
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                autoFocus
                onClick={() => setShowLogoutModal(false)}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border: '1px solid #E2EFE7',
                  backgroundColor: '#FAFDFB',
                  color: 'var(--text-secondary, #4A5D4E)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  backgroundColor: '#168B62',
                  borderColor: '#168B62',
                  color: '#ffffff',
                  cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  opacity: isLoggingOut ? 0.7 : 1,
                }}
              >
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
