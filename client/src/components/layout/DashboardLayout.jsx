import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import AppHeader from './AppHeader.jsx';

/**
 * Layout wrapper for authenticated dashboard routes.
 * Includes sidebar navigation and responsive workspace layout.
 */
const DashboardLayout = () => {
  return (
    <div className="layout-wrapper dashboard-layout">
      <AppHeader />
      <div className="dashboard-body container">
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'sidebar-link' : 'sidebar-link'
              }
            >
              New Analysis
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'sidebar-link' : 'sidebar-link'
              }
            >
              My Problems
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'sidebar-link' : 'sidebar-link'
              }
            >
              Profile
            </NavLink>
          </nav>
        </aside>
        <main className="dashboard-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
export { DashboardLayout };
