import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { PlusCircle, Database, History } from 'lucide-react';

/**
 * Main dashboard/workspace landing page.
 * Displays welcome banner, workflow instructions, and summary action cards.
 */
const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-page-container">
      <header className="dashboard-welcome">
        <h1 className="welcome-title">
          Welcome back, {user?.fullName || user?.username}!
        </h1>
        <p className="welcome-subtitle">
          Your personal DSA mentor workspace is ready.
        </p>
      </header>

      <section className="workflow-card">
        <h3 className="workflow-title">The AlgoMentor Learning Loop</h3>
        <ul className="workflow-list">
          <li className="workflow-item">
            <span className="step-num">1</span>
            <div className="step-content">
              <strong>Save a Problem:</strong> Add your problem specifications (title, statement, constraints, example inputs).
            </div>
          </li>
          <li className="workflow-item">
            <span className="step-num">2</span>
            <div className="step-content">
              <strong>Select AI Modules:</strong> Customize your requirements (progressive hints, code review, complexity tables).
            </div>
          </li>
          <li className="workflow-item">
            <span className="step-num">3</span>
            <div className="step-content">
              <strong>Understand Conceptually:</strong> Study multiple approach explanations and spoken interview guides.
            </div>
          </li>
        </ul>
      </section>

      <section className="actions-grid">
        <div className="action-card">
          <PlusCircle className="action-icon" />
          <h4 className="action-card-title">Create New Analysis</h4>
          <p className="action-card-desc">
            Define a new DSA challenge and request customized AI mentor guidance.
          </p>
          <Link to="/problems/new" className="btn btn-outline btn-sm">
            Launch Builder
          </Link>
        </div>

        <div className="action-card">
          <Database className="action-icon" />
          <h4 className="action-card-title">View Saved Problems</h4>
          <p className="action-card-desc">
            Access your personal library of saved coding questions and implementations.
          </p>
          <Link to="/problems" className="btn btn-outline btn-sm">
            View Saved
          </Link>
        </div>

        <div className="action-card">
          <History className="action-icon" />
          <h4 className="action-card-title">Review Analysis History</h4>
          <p className="action-card-desc">
            Explore past AI evaluations, tokens usage, and learning progress.
          </p>
          <Link to="/problems" className="btn btn-outline btn-sm">
            Show History
          </Link>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
export { DashboardPage };
