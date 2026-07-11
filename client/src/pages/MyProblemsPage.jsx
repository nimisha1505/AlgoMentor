import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyProblems, deleteProblem } from '../api/problem.api.js';
import { getLatestProblemAnalysis, startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { Search, RotateCw, Trash2, BookOpen, ExternalLink, Calendar } from 'lucide-react';

const MyProblemsPage = () => {
  const navigate = useNavigate();

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Data states
  const [problems, setProblems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalProblems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // UX states
  const [isLoading, setIsLoading] = useState(true);
  const [generalError, setGeneralError] = useState('');
  // Track loading per card by storing problemId as keys in an object
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

  // Re-fetch when filters/page changes
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
      <div className="page-header-row">
        <div>
          <h1 className="page-title">My Saved Problems</h1>
          <p className="page-subtitle">Browse, filter, and review your algorithm collection.</p>
        </div>
        <Link to="/problems/new" className="btn btn-primary">
          New Analysis
        </Link>
      </div>

      {/* Filter and Search Form */}
      <form onSubmit={handleSearchSubmit} className="filters-form-card">
        <div className="search-input-group">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search problems by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            Search
          </button>
        </div>

        <div className="filter-selects-group">
          <div className="filter-select-item">
            <label htmlFor="filter-lang">Language</label>
            <select
              id="filter-lang"
              value={language}
              onChange={(e) => {
                setPage(1);
                setLanguage(e.target.value);
              }}
            >
              <option value="">All Languages</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="c">C</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-select-item">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">All Statuses</option>
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
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      </form>

      {generalError && <FormError message={generalError} />}

      {isLoading ? (
        <div className="page-loader-wrapper">
          <Loader text="Fetching your problem library..." />
        </div>
      ) : problems.length === 0 ? (
        <EmptyState
          title="No problems found"
          description={
            searchQuery || language || status
              ? "No problems match your current filters. Try resetting search fields."
              : "You haven't submitted any problems for analysis yet."
          }
          action={
            !searchQuery && !language && !status ? (
              <Link to="/problems/new" className="btn btn-primary">
                Analyze First Problem
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <div className="problems-grid">
            {problems.map((problem) => {
              const isCardBusy = !!cardActionLoading[problem._id];
              const normalizedStatus = (problem.status || '').toLowerCase();

              return (
                <div key={problem._id} className="problem-card">
                  <div className="problem-card-header">
                    <h3 className="problem-card-title">{problem.title}</h3>
                    <StatusBadge status={problem.status} />
                  </div>

                  <div className="problem-card-meta">
                    <span className="meta-item">
                      <strong>Language:</strong> {getLanguageLabel(problem.language)}
                    </span>
                    <span className="meta-item">
                      <strong>Modules:</strong> {problem.requestedSections?.length || 0} selected
                    </span>
                  </div>

                  <div className="problem-card-dates">
                    <div className="date-row">
                      <Calendar size={12} />
                      <span>Created: {new Date(problem.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="problem-card-actions">
                    <Link
                      to={`/problems/${problem._id}`}
                      className="card-action-btn"
                      title="Open details"
                    >
                      <BookOpen size={14} />
                      <span>Details</span>
                    </Link>

                    {normalizedStatus === 'completed' && (
                      <button
                        onClick={() => handleViewLatestAnalysis(problem._id)}
                        disabled={isCardBusy}
                        className="card-action-btn primary-action"
                        title="View analysis result"
                      >
                        <ExternalLink size={14} />
                        <span>
                          {cardActionLoading[problem._id] === 'latest'
                            ? 'Loading...'
                            : 'View Analysis'}
                        </span>
                      </button>
                    )}

                    {(normalizedStatus === 'draft' || normalizedStatus === 'failed') && (
                      <button
                        onClick={() => handleRetryAnalysis(problem._id)}
                        disabled={isCardBusy}
                        className="card-action-btn warning-action"
                        title="Retry AI Mentor analysis generation"
                      >
                        <RotateCw size={14} />
                        <span>
                          {cardActionLoading[problem._id] === 'retry'
                            ? 'Retrying...'
                            : 'Run Analysis'}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(problem._id)}
                      disabled={isCardBusy}
                      className="card-action-btn danger-action"
                      title="Delete problem"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {pagination.totalPages > 1 && (
            <div className="pagination-wrapper">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={!pagination.hasPreviousPage || isLoading}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalProblems} total)
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
        </>
      )}
    </div>
  );
};

export default MyProblemsPage;
export { MyProblemsPage };
