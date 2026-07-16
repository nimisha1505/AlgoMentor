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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentProblems, setRecentProblems] = useState([]);

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
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit', width: '100%' }}>
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
        <Link to="/" className="mobile-header-left" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
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
          <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
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
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
