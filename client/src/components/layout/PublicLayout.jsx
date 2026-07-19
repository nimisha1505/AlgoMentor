import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader.jsx';

/**
 * Layout wrapper for public pages (Landing page, Login, Register).
 */
const PublicLayout = () => {
  return (
    <div className="layout-wrapper public-layout">
      <AppHeader />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <div className="site-container">
          <p>&copy; {new Date().getFullYear()} AlgoMentor. Understand DSA. Don't just memorize it.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
export { PublicLayout };
