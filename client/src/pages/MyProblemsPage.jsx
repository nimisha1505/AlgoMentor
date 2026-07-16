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
    <div className="saved-problems-page container">
      {/* 1. Page Intro */}
      <section className="sp-intro">
        <div className="sp-intro-text">
          <span className="sp-intro-eyebrow">Your learning library</span>
          <h1 className="sp-intro-heading">Saved Problems</h1>
          <p className="sp-intro-support">Revisit problems, continue unfinished learning, and review what you have already studied.</p>
        </div>
        <div className="sp-intro-action">
          <Link to="/problems/new" className="sp-btn-primary">
            <PlusCircle size={16} />
            <span>Learn a Problem</span>
          </Link>
        </div>
      </section>

      <div className="sp-divider"></div>

      {/* 2. Compact Summary Strip */}
      {pagination.totalProblems !== undefined && (
        <div className="sp-summary-strip">
          <span className="sp-summary-item">
            <span className="sp-dot db-blue"></span>
            {pagination.totalProblems} saved
          </span>
        </div>
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
        <div className="sp-error-inline">
          <span>We couldn’t load your saved problems.</span>
          <button onClick={() => fetchProblems()} className="sp-btn-text">Try Again</button>
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
          <p className="sp-empty-text">No saved problems yet.<br/>Start with a problem you want to understand deeply.</p>
          <Link to="/problems/new" className="sp-btn-primary">Learn a Problem</Link>
        </div>
      ) : (
        /* 4. Saved Problem List */
        <div className="sp-list">
          {problems.map((problem) => {
            const isCardBusy = !!cardActionLoading[problem._id];
            const normalizedStatus = (problem.status || '').toLowerCase();
            const hasRevisionToday = problem.nextRevisionAt && new Date(problem.nextRevisionAt) <= new Date();
            
            // Status mapping
            let statusText = 'Not started';
            if (normalizedStatus === 'draft') statusText = 'Not started';
            else if (normalizedStatus === 'queued') statusText = 'Queued';
            else if (normalizedStatus === 'processing') statusText = 'Analyzing';
            else if (normalizedStatus === 'completed') statusText = 'Complete';
            else if (normalizedStatus === 'failed') statusText = 'Failed';

            // Confidence handling
            const confRaw = (problem.confidence || 'learning').toLowerCase();
            let confPct = 50; 
            let confColorClass = 'sp-conf-blue';
            if (confRaw === 'weak') { confPct = 25; confColorClass = 'sp-conf-amber'; }
            else if (confRaw === 'mastered') { confPct = 90; confColorClass = 'sp-conf-green'; }
            else if (confRaw === 'confident') { confPct = 75; confColorClass = 'sp-conf-green'; }

            // Row color logic
            let rowAccent = 'sp-accent-blue'; 
            if (normalizedStatus === 'completed' || confRaw === 'mastered') rowAccent = 'sp-accent-green';
            else if (normalizedStatus === 'processing') rowAccent = 'sp-accent-violet';
            else if (hasRevisionToday) rowAccent = 'sp-accent-amber';
            else if (normalizedStatus === 'failed') rowAccent = 'sp-accent-red';

            // Difficulty styling
            const diff = (problem.difficulty || 'unknown').toLowerCase();
            let diffClass = '';
            if (diff === 'easy') diffClass = 'sp-diff-easy';
            if (diff === 'medium') diffClass = 'sp-diff-medium';
            if (diff === 'hard') diffClass = 'sp-diff-hard';

            // Revision string
            let revText = 'Not scheduled';
            if (hasRevisionToday) {
              revText = 'Due today';
            } else if (problem.nextRevisionAt) {
              const days = Math.ceil((new Date(problem.nextRevisionAt) - new Date()) / (1000 * 60 * 60 * 24));
              if (days === 1) revText = 'Due tomorrow';
              else if (days > 1) revText = `In ${days} days`;
            }
            
            return (
              <div key={problem._id} className={`sp-row ${rowAccent}`}>
                <div className="sp-col-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {problem.isBookmarked && <Star size={14} fill="#c98512" stroke="#c98512" />}
                    <Link to={`/problems/${problem._id}`} className="sp-problem-title">
                      {problem.title}
                    </Link>
                  </div>
                  <div className="sp-problem-meta">
                    {diff !== 'unknown' && <span className={`sp-diff-badge ${diffClass}`}>{diff}</span>}
                    {diff !== 'unknown' && <span className="sp-dot-separator">·</span>}
                    <span className="sp-meta-text">
                      {problem.patterns && problem.patterns.length > 0 ? problem.patterns[0] : 'Uncategorised'}
                    </span>
                  </div>
                  <div className="sp-problem-date">
                     {problem.updatedAt ? `Last studied ${new Date(problem.updatedAt).toLocaleDateString()}` : 'No activity'}
                  </div>
                  <div className="sp-problem-status-text">
                    {statusText}
                  </div>
                </div>

                <div className="sp-col-center">
                  <div className="sp-conf-block">
                    <span className="sp-conf-label">Confidence {confPct}%</span>
                    <div className="sp-conf-track">
                      <div className={`sp-conf-fill ${confColorClass}`} style={{ width: `${confPct}%` }}></div>
                    </div>
                  </div>
                  <div className={`sp-rev-block ${hasRevisionToday ? 'sp-rev-due' : ''}`}>
                    {hasRevisionToday ? 'Revision due' : `Revision in ${revText === 'Not scheduled' ? 'N/A' : revText.replace('In ', '')}`}
                  </div>
                </div>

                <div className="sp-col-right">
                  {normalizedStatus === 'completed' ? (
                     <button onClick={() => handleViewLatestAnalysis(problem._id)} disabled={isCardBusy} className="sp-btn-text">
                        Continue →
                     </button>
                  ) : (
                     <button onClick={() => handleRetryAnalysis(problem._id)} disabled={isCardBusy} className="sp-btn-text">
                        View →
                     </button>
                  )}
                  <button onClick={() => handleDelete(problem._id)} disabled={isCardBusy} className="sp-btn-icon" title="Delete">
                     <Trash2 size={16} />
                  </button>
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
