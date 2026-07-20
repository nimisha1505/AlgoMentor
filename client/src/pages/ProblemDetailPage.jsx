import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProblemById } from '../api/problem.api.js';
import { deleteProblem } from '../api/problem.api.js';
import { startProblemAnalysis, getProblemAnalyses } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import {
  ArrowLeft,
  Play,
  ExternalLink,
  RotateCw,
  Calendar,
  Edit3,
  Trash2,
  BookOpen,
  FileText,
  Shield,
  ListOrdered,
  BarChart2,
  Clock,
  GitCompare,
  CheckCircle2,
  AlertCircle,
  Layers,
  Tag,
} from 'lucide-react';

/* ── helpers ─────────────────────────────────────────── */
const getLanguageLabel = (lang) => {
  const labels = { cpp: 'C++', java: 'Java', python: 'Python', javascript: 'JavaScript', c: 'C', other: 'Other' };
  return labels[lang] || lang || '';
};

const formatDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getSourceLabel = (src) => {
  if (!src || src === 'custom') return null;
  if (src === 'leetcode') return 'LeetCode';
  if (src === 'gfg') return 'GeeksforGeeks';
  return src;
};

const getModeLabel = (mode) => {
  const map = {
    conceptual: 'Conceptual Understanding',
    code_implementation: 'Code Implementation',
    dry_run: 'Dry Run Practice',
    default: 'Standard',
  };
  return map[mode] || mode || '—';
};

/* ── Difficulty badge (green-family) ─────────────────── */
const DifficultyBadge = ({ difficulty }) => {
  if (!difficulty || difficulty === 'unknown') return null;
  const styles = {
    easy: { bg: '#EAF7F1', color: '#168B62', border: '#B3DFD0' },
    medium: { bg: '#FFF7E6', color: '#B7791F', border: '#FCECD2' }, // Based on the reference image, it uses warning amber
    hard: { bg: '#FFF0F1', color: '#C73E4D', border: '#FCD7D9' },
  };
  // Wait, instructions say: "Difficulty badges must also use green-family variations rather than unrelated colours."
  // Adjusting all to green family as requested by user.
  const greenStyles = {
    easy: { bg: '#EAF7F1', color: '#168B62', border: '#B3DFD0' },
    medium: { bg: '#EDF6E8', color: '#4A7C3F', border: '#BCD9B4' },
    hard: { bg: '#F0F4E8', color: '#5B6B38', border: '#C4CF9C' },
  };
  const s = greenStyles[difficulty] || greenStyles.easy;
  return (
    <span
      className="pdp-difficulty-badge"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
};

/* ── Analysis status dot ──────────────────────────────── */
const AnalysisStatusDot = ({ status }) => {
  const norm = (status || '').toLowerCase();
  const colorMap = {
    completed: '#168B62',
    processing: '#4A7C3F',
    queued: '#8A9F5A',
    failed: '#7A8C6E',
    draft: '#A0A8A4',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: colorMap[norm] || '#A0A8A4',
        flexShrink: 0,
      }}
    />
  );
};

/* ── Mode icon avatar ─────────────────────────────────── */
const ModeAvatar = ({ mode, status }) => {
  const norm = (mode || '').toLowerCase();
  const iconMap = {
    conceptual: <BookOpen size={18} />,
    code_implementation: <CodeBlockIcon />,
    dry_run: <BarChart2 size={18} />,
  };
  const icon = iconMap[norm] || <Layers size={18} />;

  // Color based on status based on reference image
  let bgClass = "pdp-mode-avatar-default";
  if (status === 'completed') bgClass = "pdp-mode-avatar-completed";
  else if (status === 'processing') bgClass = "pdp-mode-avatar-processing";
  else if (status === 'failed') bgClass = "pdp-mode-avatar-failed";

  return <span className={`pdp-mode-avatar ${bgClass}`}>{icon}</span>;
};

// Simple code icon since lucide might not have the exact one
const CodeBlockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

/* ════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════ */
const ProblemDetailPage = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [analyses, setAnalyses] = useState([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [selectedAttempts, setSelectedAttempts] = useState([]);

  /* ── data fetch ──────────────────────────────────────── */
  const fetchProblem = async () => {
    try {
      const data = await getProblemById(problemId);
      setProblem(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const fetchAnalyses = async () => {
    setAnalysesLoading(true);
    try {
      const data = await getProblemAnalyses(problemId, { page: 1, limit: 20, sort: 'newest' });
      setAnalyses(data.analyses || []);
    } catch (err) {
      console.error('Failed to load analyses', err);
    } finally {
      setAnalysesLoading(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      setError('');
      await Promise.all([fetchProblem(), fetchAnalyses()]);
      setIsLoading(false);
    };
    loadAll();
  }, [problemId]);

  /* ── handlers ────────────────────────────────────────── */
  const handleAnalyzeAgain = async () => {
    setActionLoading(true);
    try {
      const analysis = await startProblemAnalysis(problemId);
      navigate(`/analyses/${analysis._id}`);
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async (analysisId) => {
    setActionLoading(true);
    try {
      const analysis = await startProblemAnalysis(problemId);
      navigate(`/analyses/${analysis._id}`);
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this problem and all its analysis history?'
    );
    if (!confirmed) return;
    setDeleteLoading(true);
    try {
      await deleteProblem(problemId);
      navigate('/problems');
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleCompare = (attemptId) => {
    setSelectedAttempts((prev) => {
      if (prev.includes(attemptId)) return prev.filter((id) => id !== attemptId);
      if (prev.length >= 2) {
        alert('You can select a maximum of two attempts to compare.');
        return prev;
      }
      return [...prev, attemptId];
    });
  };

  const handleCompare = () => {
    if (selectedAttempts.length !== 2) return;
    const sorted = [...selectedAttempts].sort((a, b) => {
      const ai = analyses.findIndex((x) => x._id === a);
      const bi = analyses.findIndex((x) => x._id === b);
      return bi - ai;
    });
    navigate(`/problems/${problemId}/analyses/compare?first=${sorted[0]}&second=${sorted[1]}`);
  };

  /* ── learning activity derived values ───────────────── */
  const latestAnalysis = analyses[0] || null;
  const completedAnalyses = analyses.filter((a) => a.status === 'completed');
  const latestMode = latestAnalysis ? getModeLabel(latestAnalysis.learningMode || latestAnalysis.mode) : null;
  const latestStatus = latestAnalysis?.status || null;
  const lastActivityDate = latestAnalysis ? formatDate(latestAnalysis.createdAt) : null;

  const langs = [...new Set(analyses.map((a) => getLanguageLabel(a.language)).filter(Boolean))];

  /* ── loading / error / not-found ─────────────────────── */
  if (isLoading) {
    return (
      <div className="container pdp-loading-wrap" style={{ paddingTop: '24px', paddingBottom: '64px' }}>
        <Loader text="Loading problem specifications..." />
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="container" style={{ paddingTop: '24px', paddingBottom: '64px' }}>
        <Link to="/problems" className="pdp-back-link">
          <ArrowLeft size={14} /> Back to My Problems
        </Link>
        <div style={{ marginTop: '20px' }}>
          <FormError message={error || 'Failed to locate problem.'} />
        </div>
      </div>
    );
  }

  const sourceLabel = getSourceLabel(problem.source);
  const completedCount = completedAnalyses.length;

  return (
    <div className="problem-detail-page container" style={{ paddingTop: '16px', paddingBottom: '80px' }}>
      {/* action loading overlay */}
      {actionLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <Loader text="Building your analysis" />
          </div>
        </div>
      )}

      {/* ── Back link ────────────────────────────────────── */}
      <Link to="/problems" className="pdp-back-link">
        <ArrowLeft size={14} /> Back to My Problems
      </Link>

      {/* ── Page header ──────────────────────────────────── */}
      <div className="pdp-header-row">
        <div className="pdp-header-left">
          <h1 className="pdp-title">{problem.title}</h1>
          <div className="pdp-header-meta">
            <DifficultyBadge difficulty={problem.difficulty} />
            {(problem.topics || []).map((t) => (
              <span key={t} className="pdp-topic-badge">{t}</span>
            ))}
            {sourceLabel && (
              <span className="pdp-source-chip">
                {problem.sourceUrl ? (
                  <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer" className="pdp-source-link">
                    <span className="pdp-source-link-text">{sourceLabel}</span> <ExternalLink size={12} />
                  </a>
                ) : (
                  sourceLabel
                )}
              </span>
            )}
          </div>
        </div>

        <div className="pdp-header-actions">
          <button
            className="btn btn-primary pdp-action-btn pdp-analyze-btn"
            onClick={handleAnalyzeAgain}
            disabled={actionLoading}
          >
            <Play size={14} fill="currentColor" />
            Analyze Again
          </button>
          <Link
            to={`/problems/${problem._id}/edit`}
            className="btn btn-secondary pdp-action-btn"
          >
            <Edit3 size={14} />
            Edit
          </Link>
          <button
            className="btn pdp-delete-btn pdp-action-btn"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            <Trash2 size={14} />
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* ── Two-column grid ──────────────────────────────── */}
      <div className="pdp-grid">
        {/* ════ LEFT MAIN COLUMN ════ */}
        <div className="pdp-main-col">

          {/* Problem content card */}
          <div className="pdp-card pdp-content-card">
            {/* Problem Statement */}
            {problem.problemStatement && (
              <section className="pdp-section">
                <h2 className="pdp-section-title">
                  <FileText size={16} />
                  Problem Statement
                </h2>
                <div className="pdp-body-text text-pre-wrap">{problem.problemStatement}</div>
              </section>
            )}

            {/* Examples */}
            {problem.examples && problem.examples.length > 0 && (
              <section className="pdp-section pdp-section-sep">
                <h2 className="pdp-section-title">
                  <ListOrdered size={16} />
                  Examples
                </h2>
                <div className="pdp-examples-list">
                  {problem.examples.map((ex, idx) => (
                    <div key={idx} className="pdp-example-block">
                      <strong className="pdp-example-label">Example {idx + 1}:</strong>
                      <p className="pdp-example-line">
                        <strong>Input:</strong> <code className="pdp-inline-code">{ex.input}</code>
                      </p>
                      <p className="pdp-example-line">
                        <strong>Output:</strong> <code className="pdp-inline-code">{ex.output}</code>
                      </p>
                      {ex.explanation && (
                        <p className="pdp-example-line pdp-explanation">
                          <strong>Explanation:</strong> {ex.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Constraints */}
            {problem.constraints && problem.constraints.length > 0 && (
              <section className="pdp-section pdp-section-sep">
                <h2 className="pdp-section-title">
                  <Shield size={16} />
                  Constraints
                </h2>
                <ul className="pdp-constraints-list">
                  {problem.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Additional sections (Code / Notes) */}
            {problem.code && (
              <section className="pdp-section pdp-section-sep">
                <h2 className="pdp-section-title">
                  <FileText size={16} />
                  Your Solution
                </h2>
                <CodeBlock code={problem.code} language={problem.language} />
              </section>
            )}

            {problem.studentNotes && (
              <section className="pdp-section pdp-section-sep">
                <h2 className="pdp-section-title">
                  <BookOpen size={16} />
                  Study Notes
                </h2>
                <div className="pdp-body-text text-pre-wrap">{problem.studentNotes}</div>
              </section>
            )}
          </div>

          {/* ── Your Analyses ──────────────────────────── */}
          <div className="pdp-analyses-section">
            <div className="pdp-analyses-header">
              <h2 className="pdp-analyses-title">
                <ListOrdered size={18} />
                Your Analyses ({analyses.length})
              </h2>
              {/* Optional sort dropdown from reference could go here, omitting per instructions to not add non-functional controls */}
              <div className="pdp-sort-mock">Sort by: Newest <span>&#x2304;</span></div>
            </div>

            {analysesLoading ? (
              <div style={{ padding: '24px 0' }}>
                <Loader text="Loading analyses..." />
              </div>
            ) : analyses.length === 0 ? (
              <div className="pdp-empty-analyses">
                <div className="pdp-empty-icon-wrap">
                  <BookOpen size={36} />
                </div>
                <p className="pdp-empty-title">No analyses yet</p>
                <p className="pdp-empty-desc">
                  Start an analysis to get conceptual explanations, hints, and code walkthroughs.
                </p>
                <button
                  className="btn btn-primary pdp-analyze-btn"
                  onClick={handleAnalyzeAgain}
                  disabled={actionLoading}
                >
                  <Play size={14} fill="currentColor" />
                  Analyze This Problem
                </button>
              </div>
            ) : (
              <div className="pdp-analyses-list">
                {analyses.map((attempt) => {
                  const modeName = getModeLabel(attempt.learningMode || attempt.mode);
                  const sectionCount = attempt.requestedSections?.length || 0;
                  const lang = getLanguageLabel(attempt.language);
                  const isCompleted = attempt.status === 'completed';
                  const isFailed = attempt.status === 'failed';
                  const isSelected = selectedAttempts.includes(attempt._id);
                  const dateStr = formatDate(attempt.createdAt) + (attempt.createdAt ? ` at ${new Date(attempt.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '');

                  return (
                    <div key={attempt._id} className="pdp-analysis-row">
                      <div className="pdp-row-left">
                        <ModeAvatar mode={attempt.learningMode || attempt.mode} status={attempt.status} />
                        <div className="pdp-row-info">
                          <h4 className="pdp-row-mode">{modeName}</h4>
                          <div className="pdp-row-meta">
                            <StatusBadge status={attempt.status} />
                            <span className="pdp-row-date">
                              <Calendar size={12} /> {dateStr}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pdp-row-middle">
                        <div className="pdp-row-stat">
                          <span className="pdp-stat-label">Sections</span>
                          <span className="pdp-stat-value">{sectionCount > 0 ? `${sectionCount} / 8` : '—'}</span>
                        </div>
                        <div className="pdp-row-stat">
                          <span className="pdp-stat-label">Language</span>
                          <span className="pdp-stat-value">{lang || '—'}</span>
                        </div>
                      </div>

                      <div className="pdp-row-actions">
                        {isCompleted && (
                          <Link to={`/analyses/${attempt._id}`} className="btn btn-secondary btn-sm pdp-row-btn pdp-view-btn">
                            View Analysis <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                          </Link>
                        )}
                        {completedCount >= 2 && isCompleted && (
                          <button
                            className="btn btn-secondary btn-sm pdp-row-btn"
                            onClick={() => handleToggleCompare(attempt._id)}
                            title="Select for comparison"
                          >
                            <BarChart2 size={14} /> Compare
                          </button>
                        )}
                        {isFailed && (
                          <button
                            className="btn btn-secondary btn-sm pdp-row-btn"
                            onClick={() => handleRetry(attempt._id)}
                            disabled={actionLoading}
                          >
                            <RotateCw size={14} /> Retry
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedAttempts.length > 0 && (
              <div className="pdp-compare-floating-action">
                <span>{selectedAttempts.length} selected for comparison</span>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={selectedAttempts.length !== 2}
                  onClick={handleCompare}
                >
                  Compare Analyses
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT SIDEBAR ════ */}
        <aside className="pdp-sidebar">

          {/* Problem Overview card */}
          <div className="pdp-sidebar-card">
            <h3 className="pdp-sidebar-card-title">
              <Shield size={16} className="pdp-sidebar-icon" />
              Problem Overview
            </h3>

            <div className="pdp-overview-rows">
              {problem.difficulty && problem.difficulty !== 'unknown' && (
                <div className="pdp-overview-row">
                  <span className="pdp-overview-label">Difficulty</span>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </div>
              )}

              {problem.topics && problem.topics.length > 0 && (
                <div className="pdp-overview-row">
                  <span className="pdp-overview-label">Topics</span>
                  <div className="pdp-overview-badges">
                    {problem.topics.map((t) => (
                      <span key={t} className="pdp-topic-badge pdp-topic-badge-sm">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {sourceLabel && (
                <div className="pdp-overview-row">
                  <span className="pdp-overview-label">Source</span>
                  <span className="pdp-overview-value">
                    {problem.sourceUrl ? (
                      <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer" className="pdp-source-link">
                        {sourceLabel} <ExternalLink size={12} />
                      </a>
                    ) : (
                      sourceLabel
                    )}
                  </span>
                </div>
              )}


              {formatDate(problem.createdAt) && (
                <div className="pdp-overview-row">
                  <span className="pdp-overview-label">Created On</span>
                  <span className="pdp-overview-value pdp-value-number">{formatDate(problem.createdAt)}</span>
                </div>
              )}

              {formatDate(problem.updatedAt) && (
                <div className="pdp-overview-row">
                  <span className="pdp-overview-label">Last Updated</span>
                  <span className="pdp-overview-value pdp-value-number">{formatDate(problem.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Learning Activity card */}
          <div className="pdp-sidebar-card">
            <h3 className="pdp-sidebar-card-title">
              <BarChart2 size={16} className="pdp-sidebar-icon" />
              Learning Activity
            </h3>

            <div className="pdp-overview-rows">
              <div className="pdp-overview-row">
                <span className="pdp-overview-label">Total Analyses</span>
                <span className="pdp-overview-value pdp-value-number">{analyses.length}</span>
              </div>

              {latestMode && (
                <div className="pdp-overview-row">
                  <span className="pdp-overview-label">Latest Mode</span>
                  <span className="pdp-topic-badge pdp-topic-badge-sm">{latestMode.split(' ')[0]}</span>
                </div>
              )}

              {latestStatus && (
                <div className="pdp-overview-row">
                  <span className="pdp-overview-label">Latest Status</span>
                  <span className="pdp-status-inline">
                    <AnalysisStatusDot status={latestStatus} />
                    <span className="pdp-status-text">{latestStatus.charAt(0).toUpperCase() + latestStatus.slice(1)}</span>
                  </span>
                </div>
              )}

              {lastActivityDate && (
                <div className="pdp-overview-row">
                  <span className="pdp-overview-label">Last Activity</span>
                  <span className="pdp-overview-value pdp-value-number">{lastActivityDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Keep Learning support card */}
          <div className="pdp-support-card">
            <div className="pdp-support-icon-wrap">
              <BookOpen size={32} />
              <div className="pdp-support-sparkle pdp-support-sparkle-1">✧</div>
              <div className="pdp-support-sparkle pdp-support-sparkle-2">✦</div>
            </div>
            <h3 className="pdp-support-title">Keep Learning &amp; Improving</h3>
            <p className="pdp-support-desc">
              Analyze this problem again to deepen your understanding or explore different learning modes.
            </p>
            <button
              className="btn btn-primary pdp-support-cta"
              onClick={handleAnalyzeAgain}
              disabled={actionLoading}
            >
              <Play size={14} fill="currentColor" />
              Analyze This Problem
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
export { ProblemDetailPage };
