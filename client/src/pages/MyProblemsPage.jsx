import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyProblems, deleteProblem } from '../api/problem.api.js';
import { getLatestProblemAnalysis, startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { Search, RotateCw, Trash2, BookOpen, ExternalLink, PlusCircle } from 'lucide-react';

const MyProblemsPage = () => {
  const navigate = useNavigate();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Data
  const [problems, setProblems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalProblems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Loadings
  const [isLoading, setIsLoading] = useState(true);
  const [generalError, setGeneralError] = useState('');
  const [cardActionLoading, setCardActionLoading] = useState({});

  const fetchProblems = async () => {
    setIsLoading(true);
    setGeneralError('');
    try {
      const data = await getMyProblems({
        page,
        limit: 10,
        status: status || undefined,
        language: language || undefined,
        search: searchQuery || undefined,
      });

      setProblems(data.problems || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: 10,
          totalProblems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      );
    } catch (err) {
      setGeneralError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [page, language, status, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchTerm);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSearchQuery('');
    setLanguage('');
    setStatus('');
    setPage(1);
  };

  const handleDelete = async (problemId) => {
    const confirmed = window.confirm('Are you sure you want to delete this problem and all its analysis history?');
    if (!confirmed) return;

    try {
      await deleteProblem(problemId);
      setProblems((prev) => prev.filter((p) => p._id !== problemId));
      setPagination((prev) => ({
        ...prev,
        totalProblems: prev.totalProblems - 1,
      }));
    } catch (err) {
      alert(getApiErrorMessage(err));
    }
  };

  const handleViewLatestAnalysis = async (problemId) => {
    setCardActionLoading((prev) => ({ ...prev, [problemId]: 'latest' }));
    try {
      const analysis = await getLatestProblemAnalysis(problemId);
      navigate(`/analyses/${analysis._id}`);
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setCardActionLoading((prev) => ({ ...prev, [problemId]: null }));
    }
  };

  const handleRetryAnalysis = async (problemId) => {
    setCardActionLoading((prev) => ({ ...prev, [problemId]: 'retry' }));
    try {
      const analysis = await startProblemAnalysis(problemId);
      navigate(`/analyses/${analysis._id}`);
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setCardActionLoading((prev) => ({ ...prev, [problemId]: null }));
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
    <div className="my-problems-container">
      {/* Page Header */}
      <div className="page-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">My problems</h1>
          <p className="page-subtitle">Everything you have saved and analysed.</p>
        </div>
        <Link to="/problems/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PlusCircle size={14} />
          <span>Analyse a problem</span>
        </Link>
      </div>

      {/* Top Toolbar */}
      <form onSubmit={handleSearchSubmit} className="toolbar-row" style={{ marginBottom: '24px' }}>
        <div className="toolbar-left">
          <div className="search-bar-box" style={{ maxWidth: '320px' }}>
            <Search size={14} className="search-bar-icon" />
            <input
              type="text"
              placeholder="Search saved problems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-selects-row">
            <div className="filter-select-box">
              <label htmlFor="lang-filter">Language</label>
              <select
                id="lang-filter"
                value={language}
                onChange={(e) => {
                  setPage(1);
                  setLanguage(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="c">C</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="filter-select-box">
              <label htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="queued">Queued</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {(searchQuery || language || status) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="clear-text-btn"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </form>

      {generalError && <FormError message={generalError} />}

      {isLoading ? (
        <div className="loader-container">
          <Loader text="Fetching saved problems..." />
        </div>
      ) : problems.length === 0 ? (
        <EmptyState
          title="No saved problems yet"
          description={
            searchQuery || language || status
              ? "No saved problems match these filters."
              : "Start with a problem you recently found difficult."
          }
          action={
            !searchQuery && !language && !status ? (
              <Link to="/problems/new" className="btn btn-primary">
                Analyse your first problem
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="table-card">
          <table className="problems-list-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Language</th>
                <th>Status</th>
                <th>Learning sections</th>
                <th>Updated</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => {
                const isCardBusy = !!cardActionLoading[problem._id];
                const normalizedStatus = (problem.status || '').toLowerCase();

                return (
                  <tr key={problem._id}>
                    <td>
                      <Link
                        to={`/problems/${problem._id}`}
                        className="problem-row-title-link"
                        style={{ fontSize: '14px', fontWeight: '700' }}
                      >
                        {problem.title}
                      </Link>
                    </td>
                    <td>
                      <span className="list-meta-text">
                        {getLanguageLabel(problem.language)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={problem.status} />
                    </td>
                    <td>
                      <span className="list-meta-text">
                        {problem.requestedSections?.length || 0} modules
                      </span>
                    </td>
                    <td>
                      <span className="list-date-text">
                        {new Date(problem.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div className="list-row-actions" style={{ justifyContent: 'flex-end' }}>
                        <Link
                          to={`/problems/${problem._id}`}
                          className="list-action-icon-btn"
                          title="Open details"
                        >
                          <BookOpen size={14} />
                        </Link>

                        {normalizedStatus === 'completed' && (
                          <button
                            onClick={() => handleViewLatestAnalysis(problem._id)}
                            disabled={isCardBusy}
                            className="list-action-icon-btn"
                            title="View analysis report"
                            style={{ color: 'var(--accent)' }}
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}

                        {(normalizedStatus === 'draft' || normalizedStatus === 'failed') && (
                          <button
                            onClick={() => handleRetryAnalysis(problem._id)}
                            disabled={isCardBusy}
                            className="list-action-icon-btn"
                            title="Try again"
                            style={{ color: 'var(--warning)' }}
                          >
                            <RotateCw size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(problem._id)}
                          disabled={isCardBusy}
                          className="list-action-icon-btn danger"
                          title="Delete problem"
                          style={{ marginLeft: '12px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination controls */}
          {pagination.totalPages > 1 && (
            <div className="table-pagination-row">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={!pagination.hasPreviousPage || isLoading}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <span className="pagination-numbers">
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalProblems} total)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={!pagination.hasNextPage || isLoading}
                className="btn btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyProblemsPage;
export { MyProblemsPage };
