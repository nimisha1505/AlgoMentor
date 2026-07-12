import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyProblems, deleteProblem } from '../api/problem.api.js';
import { getLatestProblemAnalysis, startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { Search, RotateCw, Trash2, BookOpen, ExternalLink, PlusCircle, Edit3, Star } from 'lucide-react';

const MyProblemsPage = () => {
  const navigate = useNavigate();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState('');
  const [topic, setTopic] = useState('');
  const [confidence, setConfidence] = useState('');
  const [isBookmarked, setIsBookmarked] = useState('');
  const [revisionDue, setRevisionDue] = useState('');
  const [source, setSource] = useState('');
  const [difficulty, setDifficulty] = useState('');
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
        source: source || undefined,
        difficulty: difficulty || undefined,
        search: searchQuery || undefined,
        topic: topic || undefined,
        confidence: confidence || undefined,
        isBookmarked: isBookmarked === 'true' ? true : isBookmarked === 'false' ? false : undefined,
        revisionDue: revisionDue === 'true' ? true : undefined,
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
  }, [page, language, status, source, difficulty, searchQuery, topic, confidence, isBookmarked, revisionDue]);

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
    setTopic('');
    setConfidence('');
    setIsBookmarked('');
    setRevisionDue('');
    setSource('');
    setDifficulty('');
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

  const hasActiveFilters = searchQuery || language || status || topic || confidence || isBookmarked || revisionDue;

  return (
    <div className="my-problems-container container" style={{ paddingBottom: '80px' }}>
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
      <form onSubmit={handleSearchSubmit} className="toolbar-row" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
          <div className="search-bar-box" style={{ flex: 1, minWidth: '240px' }}>
            <Search size={14} className="search-bar-icon" />
            <input
              type="text"
              placeholder="Search saved problems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn btn-secondary">Search</button>
        </div>

        <div className="filter-selects-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* Topic Filter */}
          <div className="filter-select-box">
            <label htmlFor="topic-filter">Topic</label>
            <select
              id="topic-filter"
              value={topic}
              onChange={(e) => {
                setPage(1);
                setTopic(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="arrays">Arrays</option>
              <option value="strings">Strings</option>
              <option value="hashing">Hashing</option>
              <option value="linkedList">Linked List</option>
              <option value="stack">Stack</option>
              <option value="queue">Queue</option>
              <option value="binarySearch">Binary Search</option>
              <option value="recursion">Recursion</option>
              <option value="backtracking">Backtracking</option>
              <option value="trees">Trees</option>
              <option value="bst">BST</option>
              <option value="heap">Heap</option>
              <option value="graph">Graph</option>
              <option value="dynamicProgramming">DP</option>
              <option value="greedy">Greedy</option>
              <option value="slidingWindow">Sliding Window</option>
              <option value="twoPointers">Two Pointers</option>
              <option value="prefixSum">Prefix Sum</option>
              <option value="bitManipulation">Bitwise</option>
              <option value="mathematics">Maths</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div className="filter-select-box">
            <label htmlFor="confidence-filter">Confidence</label>
            <select
              id="confidence-filter"
              value={confidence}
              onChange={(e) => {
                setPage(1);
                setConfidence(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="weak">Weak</option>
              <option value="learning">Learning</option>
              <option value="confident">Confident</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="filter-select-box">
            <label htmlFor="source-filter">Source</label>
            <select
              id="source-filter"
              value={source}
              onChange={(e) => {
                setPage(1);
                setSource(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="custom">Custom</option>
              <option value="leetcode">LeetCode</option>
              <option value="gfg">GeeksforGeeks</option>
              <option value="code360">Code360</option>
              <option value="codeforces">Codeforces</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="filter-select-box">
            <label htmlFor="difficulty-filter">Difficulty</label>
            <select
              id="difficulty-filter"
              value={difficulty}
              onChange={(e) => {
                setPage(1);
                setDifficulty(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="unknown">Unknown</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Bookmark Filter */}
          <div className="filter-select-box">
            <label htmlFor="bookmark-filter">Bookmarks</label>
            <select
              id="bookmark-filter"
              value={isBookmarked}
              onChange={(e) => {
                setPage(1);
                setIsBookmarked(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="true">Bookmarked</option>
              <option value="false">Unbookmarked</option>
            </select>
          </div>

          {/* Revision Due Filter */}
          <div className="filter-select-box">
            <label htmlFor="revision-filter">Revision</label>
            <select
              id="revision-filter"
              value={revisionDue}
              onChange={(e) => {
                setPage(1);
                setRevisionDue(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="true">Revision Due Today</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="clear-text-btn"
              style={{ fontWeight: '600', marginLeft: '12px' }}
            >
              Clear Filters
            </button>
          )}
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
            hasActiveFilters
              ? "No saved problems match these filters."
              : "Start with a problem you recently found difficult."
          }
          action={
            !hasActiveFilters ? (
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
                <th>Confidence</th>
                <th>Revision</th>
                <th>Modules</th>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {problem.isBookmarked && (
                            <Star size={14} fill="var(--warning)" stroke="var(--warning)" style={{ flexShrink: 0 }} />
                          )}
                          <Link
                            to={`/problems/${problem._id}`}
                            className="problem-row-title-link"
                            style={{ fontSize: '14px', fontWeight: '700' }}
                          >
                            {problem.title}
                          </Link>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                          {problem.difficulty && problem.difficulty !== 'unknown' && (
                            <span style={{
                              fontWeight: '700',
                              color: problem.difficulty === 'easy' ? 'var(--success)' : problem.difficulty === 'medium' ? 'var(--warning)' : 'var(--danger)',
                              textTransform: 'uppercase'
                            }}>
                              {problem.difficulty}
                            </span>
                          )}
                          {problem.source && problem.source !== 'custom' && (
                            <span style={{ color: 'var(--text-secondary)' }}>
                              • {problem.source === 'gfg' ? 'GeeksforGeeks' : problem.source === 'leetcode' ? 'LeetCode' : problem.source}
                            </span>
                          )}
                        </div>
                      </div>
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
                      <span className={`status-badge badge-${problem.confidence || 'learning'}`} style={{ textTransform: 'capitalize' }}>
                        {problem.confidence || 'learning'}
                      </span>
                    </td>
                    <td>
                      {problem.nextRevisionAt ? (
                        <span
                          style={new Date(problem.nextRevisionAt) <= new Date() ? { color: 'var(--warning)', fontWeight: '600', fontSize: '12px' } : { fontSize: '12px' }}
                          title="Next scheduled revision"
                        >
                          {new Date(problem.nextRevisionAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                      )}
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

                        <Link
                          to={`/problems/${problem._id}/edit`}
                          className="list-action-icon-btn"
                          title="Edit problem"
                        >
                          <Edit3 size={14} />
                        </Link>

                        {normalizedStatus === 'completed' && (
                          <button
                            onClick={() => handleViewLatestAnalysis(problem._id)}
                            disabled={isCardBusy}
                            className="list-action-icon-btn"
                            title="View analysis report"
                            style={{ color: 'var(--primary)' }}
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
                          style={{ marginLeft: '6px' }}
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
        </div>
      )}
    </div>
  );
};

export default MyProblemsPage;
export { MyProblemsPage };
