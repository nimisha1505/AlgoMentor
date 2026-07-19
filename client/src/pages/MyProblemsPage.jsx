import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyProblems, deleteProblem } from '../api/problem.api.js';
import { getLatestProblemAnalysis, startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import {
  Search,
  RotateCw,
  Trash2,
  BookOpen,
  PlusCircle,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

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

  // Stats
  const [stats, setStats] = useState({
    total: null,
    completed: null,
    processing: null,
    failed: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Loadings
  const [isLoading, setIsLoading] = useState(true);
  const [generalError, setGeneralError] = useState('');
  const [cardActionLoading, setCardActionLoading] = useState({});

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const [totalRes, completedRes, processingRes, queuedRes, failedRes] = await Promise.all([
        getMyProblems({ limit: 1 }),
        getMyProblems({ limit: 1, status: 'completed' }),
        getMyProblems({ limit: 1, status: 'processing' }),
        getMyProblems({ limit: 1, status: 'queued' }),
        getMyProblems({ limit: 1, status: 'failed' }),
      ]);

      setStats({
        total: totalRes?.pagination?.totalProblems ?? null,
        completed: completedRes?.pagination?.totalProblems ?? null,
        processing: (processingRes?.pagination?.totalProblems ?? 0) + (queuedRes?.pagination?.totalProblems ?? 0),
        failed: failedRes?.pagination?.totalProblems ?? null,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStats({
        total: null,
        completed: null,
        processing: null,
        failed: null,
      });
    } finally {
      setStatsLoading(false);
    }
  };

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
    fetchStats();
  }, []);

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
      fetchStats();
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

  const getSectionLabel = (section) => {
    const mapping = {
      problemExplanation: 'Explanation',
      exampleExplanation: 'Examples',
      hints: 'Hints',
      approachAnalysis: 'Approaches',
      completeSolution: 'Solution',
    };
    return mapping[section] || section;
  };

  const renderStatusBadge = (probStatus) => {
    const norm = (probStatus || '').toLowerCase();
    if (norm === 'completed') {
      return (
        <span className="sp-status-badge sp-status-completed">
          <CheckCircle2 size={13} />
          <span>Completed</span>
        </span>
      );
    }
    if (norm === 'processing') {
      return (
        <span className="sp-status-badge sp-status-processing">
          <RotateCw size={13} className="sp-spinner" />
          <span>Analyzing</span>
        </span>
      );
    }
    if (norm === 'queued') {
      return (
        <span className="sp-status-badge sp-status-queued">
          <Clock size={13} className="sp-spinner" />
          <span>Queued</span>
        </span>
      );
    }
    if (norm === 'failed') {
      return (
        <span className="sp-status-badge sp-status-failed">
          <AlertCircle size={13} />
          <span>Failed</span>
        </span>
      );
    }
    return (
      <span className="sp-status-badge sp-status-draft">
        <BookOpen size={13} />
        <span>Draft</span>
      </span>
    );
  };

  const hasActiveFilters = searchQuery || language || status || topic || confidence || isBookmarked || revisionDue || source || difficulty;

  return (
    <div className="saved-problems-page container">
      {/* 1. Page Header */}
      <section className="sp-intro">
        <div className="sp-intro-text">
          <span className="sp-intro-eyebrow">Your DSA library</span>
          <h1 className="sp-intro-heading">My Analyses</h1>
          <p className="sp-intro-support">Revisit your saved DSA problem analyses, track your learning progress, and review key patterns.</p>
        </div>
        <div className="sp-intro-action">
          <Link to="/problems/new" className="sp-btn-primary">
            <PlusCircle size={16} />
            <span>Analyze New Problem</span>
          </Link>
        </div>
      </section>

      <div className="sp-divider" style={{ height: '1px', backgroundColor: '#e2ede6', margin: '24px 0' }}></div>

      {/* 2. Summary Cards */}
      {statsLoading ? (
        <div className="sp-summary-cards">
          <div className="sp-summary-card sp-skel-card"></div>
          <div className="sp-summary-card sp-skel-card"></div>
          <div className="sp-summary-card sp-skel-card"></div>
          <div className="sp-summary-card sp-skel-card"></div>
        </div>
      ) : (
        (stats.total !== null || stats.completed !== null || stats.processing !== null || stats.failed !== null) && (
          <div className="sp-summary-cards">
            {stats.total !== null && (
              <div className="sp-summary-card">
                <span className="sp-card-label">Total Analyses</span>
                <span className="sp-card-value">{stats.total}</span>
              </div>
            )}
            {stats.completed !== null && (
              <div className="sp-summary-card sp-card-completed">
                <span className="sp-card-label">Completed</span>
                <span className="sp-card-value">{stats.completed}</span>
              </div>
            )}
            {stats.processing !== null && (
              <div className="sp-summary-card sp-card-processing">
                <span className="sp-card-label">Processing</span>
                <span className="sp-card-value">{stats.processing}</span>
              </div>
            )}
            {stats.failed !== null && (
              <div className="sp-summary-card sp-card-failed">
                <span className="sp-card-label">Failed</span>
                <span className="sp-card-value">{stats.failed}</span>
              </div>
            )}
          </div>
        )
      )}

      {/* 3. Search and Filter Row */}
      <form onSubmit={handleSearchSubmit} className="sp-toolbar">
        <div className="sp-search-box">
          <Search size={16} className="sp-icon-muted" />
          <input
            type="text"
            placeholder="Search saved problems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="sp-filters">
          <select value={difficulty} onChange={(e) => { setPage(1); setDifficulty(e.target.value); }}>
            <option value="">All Difficulties</option>
            <option value="unknown">Unknown</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select value={topic} onChange={(e) => { setPage(1); setTopic(e.target.value); }}>
            <option value="">All Patterns</option>
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

          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <select value={confidence} onChange={(e) => { setPage(1); setConfidence(e.target.value); }}>
            <option value="">All Confidences</option>
            <option value="weak">Weak</option>
            <option value="learning">Learning</option>
            <option value="confident">Confident</option>
            <option value="mastered">Mastered</option>
          </select>

          <select value={revisionDue} onChange={(e) => { setPage(1); setRevisionDue(e.target.value); }}>
            <option value="">All Revisions</option>
            <option value="true">Revision Due Today</option>
          </select>

          <select value={language} onChange={(e) => { setPage(1); setLanguage(e.target.value); }}>
            <option value="">All Languages</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
            <option value="other">Other</option>
          </select>

          <select value={source} onChange={(e) => { setPage(1); setSource(e.target.value); }}>
            <option value="">All Sources</option>
            <option value="custom">Custom</option>
            <option value="leetcode">LeetCode</option>
            <option value="gfg">GeeksforGeeks</option>
            <option value="code360">Code360</option>
            <option value="codeforces">Codeforces</option>
          </select>

          <select value={isBookmarked} onChange={(e) => { setPage(1); setIsBookmarked(e.target.value); }}>
            <option value="">All Bookmarks</option>
            <option value="true">Bookmarked</option>
            <option value="false">Unbookmarked</option>
          </select>

          <button type="submit" className="sp-btn-secondary">Search</button>

          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="sp-btn-text">
              Clear Filters
            </button>
          )}
        </div>
      </form>

      {/* 7. Error State */}
      {generalError && (
        <div className="sp-error-banner">
          <div className="sp-error-banner-left">
            <AlertCircle size={20} className="sp-error-icon" />
            <div className="sp-error-message-group">
              <span className="sp-error-title">Unable to load analyses</span>
              <span className="sp-error-desc">{generalError}</span>
            </div>
          </div>
          <div className="sp-error-actions">
            <button type="button" onClick={() => fetchProblems()} className="sp-btn-retry">
              Retry
            </button>
            <Link to="/problems/new" className="sp-btn-create-new">
              Create New Analysis
            </Link>
          </div>
        </div>
      )}

      {/* 6. Loading State */}
      {isLoading ? (
        <div className="sp-loading-skeleton">
          <div className="sp-skel-title"></div>
          <div className="sp-skel-toolbar"></div>
          <div className="sp-skel-row"></div>
          <div className="sp-skel-row"></div>
          <div className="sp-skel-row"></div>
          <div className="sp-skel-row"></div>
        </div>
      ) : problems.length === 0 ? (
        /* 5. Empty State */
        <div className="sp-empty">
          <div className="sp-empty-icon-wrapper">
            <BookOpen size={48} className="sp-empty-icon" />
          </div>
          <h3 className="sp-empty-heading">No analyses yet</h3>
          <p className="sp-empty-text">
            Start by submitting a DSA problem. We will break down the approaches, explain explanations, and generate optimal solutions for your review.
          </p>
          <Link to="/problems/new" className="sp-btn-primary-green sp-empty-btn">
            Analyze Your First Problem
          </Link>
        </div>
      ) : (
        /* 3 & 4. Responsive Card List and Status Design */
        <div className="sp-list">
          {problems.map((problem) => {
            const isCardBusy = !!cardActionLoading[problem._id];
            const normalizedStatus = (problem.status || '').toLowerCase();
            const hasRevisionToday = problem.nextRevisionAt && new Date(problem.nextRevisionAt) <= new Date();

            // Confidence level for styling
            const confRaw = (problem.confidence || 'learning').toLowerCase();
            let confPct = 50; 
            let confColorClass = 'sp-conf-fill-learning';
            if (confRaw === 'weak') {
              confPct = 25;
              confColorClass = 'sp-conf-fill-weak';
            } else if (confRaw === 'mastered') {
              confPct = 90;
              confColorClass = 'sp-conf-fill-mastered';
            } else if (confRaw === 'confident') {
              confPct = 75;
              confColorClass = 'sp-conf-fill-mastered';
            }

            // Difficulty styling
            const diff = (problem.difficulty || 'unknown').toLowerCase();

            // Revision text logic
            let revText = 'Not scheduled';
            if (hasRevisionToday) {
              revText = 'Due today';
            } else if (problem.nextRevisionAt) {
              const days = Math.ceil((new Date(problem.nextRevisionAt) - new Date()) / (1000 * 60 * 60 * 24));
              if (days === 1) revText = 'Due tomorrow';
              else if (days > 1) revText = `In ${days} days`;
            }
            
            return (
              <div key={problem._id} className={`sp-card sp-card-${normalizedStatus}`}>
                {/* Card Header: Title and Status badges */}
                <div className="sp-card-header">
                  <div className="sp-card-title-group">
                    {problem.isBookmarked && (
                      <Star size={16} fill="#168b62" stroke="#168b62" />
                    )}
                    <Link to={`/problems/${problem._id}`} className="sp-card-title">
                      {problem.title}
                    </Link>
                  </div>
                  <div className="sp-card-badges">
                    {renderStatusBadge(problem.status)}
                    {problem.language && (
                      <span className="sp-language-badge">
                        {getLanguageLabel(problem.language)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body: Requested sections, Difficulty, Pattern and Dates */}
                <div className="sp-card-body">
                  {problem.requestedSections && problem.requestedSections.length > 0 && (
                    <div className="sp-card-sections">
                      <span className="sp-card-sections-label">Sections:</span>
                      <div className="sp-card-sections-list">
                        {problem.requestedSections.map((sec) => (
                          <span key={sec} className="sp-section-pill">
                            {getSectionLabel(sec)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="sp-card-metadata">
                    {diff !== 'unknown' && (
                      <span className={`sp-diff-badge sp-diff-${diff}`}>
                        {diff}
                      </span>
                    )}
                    {diff !== 'unknown' && <span className="sp-metadata-sep">•</span>}
                    <span className="sp-metadata-pattern">
                      {problem.patterns && problem.patterns.length > 0 ? problem.patterns[0] : 'Uncategorised'}
                    </span>
                    <span className="sp-metadata-sep">•</span>
                    <span className="sp-metadata-date">
                      Created {new Date(problem.createdAt).toLocaleDateString()}
                    </span>
                    <span className="sp-metadata-sep">•</span>
                    <span className="sp-metadata-date">
                      Updated {new Date(problem.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Card Footer: Confidence, Revision and Action buttons */}
                <div className="sp-card-footer">
                  <div className="sp-card-actions-left">
                    <div className="sp-card-confidence">
                      <span className="sp-conf-label">Confidence: {confPct}%</span>
                      <div className="sp-conf-track-mini">
                        <div className={`sp-conf-fill-mini ${confColorClass}`} style={{ width: `${confPct}%` }}></div>
                      </div>
                    </div>
                    {revText !== 'Not scheduled' && (
                      <span className={`sp-card-revision ${hasRevisionToday ? 'sp-rev-due-pill' : ''}`}>
                        {hasRevisionToday ? 'Revision Due Today' : `Revision: ${revText}`}
                      </span>
                    )}
                  </div>

                  <div className="sp-card-actions-right">
                    {normalizedStatus === 'completed' ? (
                      <button
                        onClick={() => handleViewLatestAnalysis(problem._id)}
                        disabled={isCardBusy}
                        className="sp-btn-primary-green"
                      >
                        {isCardBusy ? <RotateCw size={14} className="sp-spinner" /> : 'Open Analysis'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRetryAnalysis(problem._id)}
                        disabled={isCardBusy}
                        className="sp-btn-secondary-green"
                      >
                        {isCardBusy ? <RotateCw size={14} className="sp-spinner" /> : (normalizedStatus === 'failed' ? 'Retry Analysis' : 'Resume Analysis')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(problem._id)}
                      disabled={isCardBusy}
                      className="sp-btn-delete"
                      title="Delete Analysis"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {pagination.totalPages > 1 && (
            <div className="sp-pagination">
              <button 
                disabled={!pagination.hasPreviousPage} 
                onClick={() => setPage(p => p - 1)}
                className="sp-btn-secondary"
              >
                Previous
              </button>
              <span className="sp-page-info">Page {pagination.page} of {pagination.totalPages}</span>
              <button 
                disabled={!pagination.hasNextPage} 
                onClick={() => setPage(p => p + 1)}
                className="sp-btn-secondary"
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
