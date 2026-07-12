import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getMyProblems } from '../api/problem.api.js';
import { getLatestProblemAnalysis } from '../api/analysis.api.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Loader from '../components/common/Loader.jsx';
import { PlusCircle, Database, History, ChevronRight } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentProblems, setRecentProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openLoadings, setOpenLoadings] = useState({});

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : (user?.username || 'User');

  useEffect(() => {
    const fetchRecent = async () => {
      setIsLoading(true);
      try {
        const data = await getMyProblems({ page: 1, limit: 3 });
        setRecentProblems(data.problems || []);
      } catch (error) {
        console.error('Failed to load recent problems on dashboard', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecent();
  }, []);

  const handleOpenProblem = async (problem) => {
    const pId = problem._id;
    const status = (problem.status || '').toLowerCase();
    
    if (status === 'completed') {
      setOpenLoadings((prev) => ({ ...prev, [pId]: true }));
      try {
        const analysis = await getLatestProblemAnalysis(pId);
        navigate(`/analyses/${analysis._id}`);
      } catch (err) {
        navigate(`/problems/${pId}`);
      } finally {
        setOpenLoadings((prev) => ({ ...prev, [pId]: false }));
      }
    } else {
      navigate(`/problems/${pId}`);
    }
  };

  const getLanguageLabel = (lang) => {
    const labels = {
      cpp: 'C++',
      java: 'Java',
      python: 'Python',
      javascript: 'JavaScript',
      c: 'C',
      other: 'Other',
    };
    return labels[lang] || lang;
  };

  return (
    <div className="dashboard-page-container">
      {/* Welcome Block */}
      <header className="dashboard-welcome" style={{ marginBottom: '16px' }}>
        <h1 className="welcome-title">Welcome back, {firstName}</h1>
        <p className="welcome-subtitle">What would you like to understand today?</p>
      </header>

      {/* Primary Workspace Card */}
      <section className="primary-workspace-card" style={{ marginBottom: '8px' }}>
        <div className="workspace-card-info">
          <h2 className="workspace-card-title">Analyse a new problem</h2>
          <p className="workspace-card-desc" style={{ fontSize: '14px' }}>
            Paste a DSA question and turn it into a complete learning path.
          </p>
        </div>
        <Link to="/problems/new" className="btn btn-primary">
          Start analysing
        </Link>
      </section>

      {/* Secondary Action links */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
        <Link to="/problems" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={14} />
          <span>Continue with saved problems</span>
        </Link>
        <Link to="/problems" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <History size={14} />
          <span>Review past analyses</span>
        </Link>
      </div>

      {/* Recent Problems Section */}
      <section className="recent-problems-section">
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-secondary)' }}>
          Recent Problems
        </h3>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Loader text="Loading recent problems..." />
          </div>
        ) : recentProblems.length === 0 ? (
          <div className="empty-state-container" style={{ padding: '32px' }}>
            <p className="empty-state-description" style={{ fontSize: '13px' }}>
              No recent problems. Paste a new coding challenge to start learning.
            </p>
            <Link to="/problems/new" className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
              Start your first analysis
            </Link>
          </div>
        ) : (
          <div className="table-card">
            <table className="problems-list-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentProblems.map((prob) => (
                  <tr key={prob._id}>
                    <td>
                      <span
                        onClick={() => handleOpenProblem(prob)}
                        style={{ fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}
                        className="problem-row-title-link"
                      >
                        {prob.title}
                      </span>
                    </td>
                    <td>
                      <span className="list-meta-text">{getLanguageLabel(prob.language)}</span>
                    </td>
                    <td>
                      <StatusBadge status={prob.status} />
                    </td>
                    <td>
                      <span className="list-date-text">{new Date(prob.updatedAt).toLocaleDateString()}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenProblem(prob)}
                        disabled={openLoadings[prob._id]}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', height: '28px' }}
                      >
                        <span>{openLoadings[prob._id] ? 'Opening...' : 'Open'}</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
export { DashboardPage };
