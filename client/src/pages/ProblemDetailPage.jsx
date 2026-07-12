import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProblemById } from '../api/problem.api.js';
import { startProblemAnalysis, getProblemAnalyses, getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, Play, ExternalLink, RotateCw, Calendar, Layers, Edit3, Clock, Cpu, Award } from 'lucide-react';

const ProblemDetailPage = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Analyses History state
  const [analyses, setAnalyses] = useState([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [selectedAttempts, setSelectedAttempts] = useState([]);

  const handleToggleSelectAttempt = (attemptId) => {
    setSelectedAttempts((prev) => {
      if (prev.includes(attemptId)) {
        return prev.filter((id) => id !== attemptId);
      } else {
        if (prev.length >= 2) {
          alert('You can select a maximum of two attempts to compare.');
          return prev;
        }
        return [...prev, attemptId];
      }
    });
  };

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
      const data = await getProblemAnalyses(problemId, { page: 1, limit: 10, sort: 'newest' });
      setAnalyses(data.analyses || []);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setAnalysesLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError('');
      await Promise.all([fetchProblem(), fetchAnalyses()]);
      setIsLoading(false);
    };
    loadData();
  }, [problemId]);

  const handleGenerate = async () => {
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

  const handleViewLatest = async () => {
    setActionLoading(true);
    try {
      const analysis = await getLatestProblemAnalysis(problemId);
      navigate(`/analyses/${analysis._id}`);
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
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

  if (isLoading) {
    return (
      <div className="loader-container">
        <Loader text="Loading problem specifications..." />
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="problem-detail-workspace container">
        <div className="reading-header">
          <Link to="/problems" className="back-link">
            <ArrowLeft size={14} /> Back to My Problems
          </Link>
        </div>
        <FormError message={error || 'Failed to locate problem.'} />
      </div>
    );
  }

  const normalizedStatus = (problem.status || '').toLowerCase();

  return (
    <div className="problem-detail-workspace container">
      {actionLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <Loader text="Building your analysis" />
          </div>
        </div>
      )}

      {/* Top Bar Navigation & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <Link to="/problems" className="back-link">
          <ArrowLeft size={14} /> Back to My Problems
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="reading-tag">{getLanguageLabel(problem.language)}</span>
          <StatusBadge status={problem.status} />

          <Link to={`/problems/${problem._id}/edit`} className="btn btn-secondary btn-sm icon-btn">
            <Edit3 size={14} />
            <span>Edit</span>
          </Link>
          
          {(normalizedStatus === 'draft' || normalizedStatus === 'failed') && (
            <button
              onClick={handleGenerate}
              disabled={actionLoading}
              className="btn btn-primary btn-sm icon-btn"
            >
              <Play size={14} />
              <span>Analyse</span>
            </button>
          )}

          {normalizedStatus === 'completed' && (
            <button
              onClick={handleViewLatest}
              disabled={actionLoading}
              className="btn btn-primary btn-sm icon-btn"
            >
              <ExternalLink size={14} />
              <span>View Latest</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Info */}
      <header style={{ marginBottom: '32px' }}>
        <h1 className="reading-title" style={{ fontSize: '32px', marginBottom: '12px' }}>
          {problem.title}
        </h1>
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            <span>Updated: {new Date(problem.updatedAt).toLocaleDateString()}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} />
            <span>Modules: {problem.requestedSections?.length || 0} selected</span>
          </span>
        </div>
      </header>

      {/* 2-Column Detail Layout */}
      <div className="detail-reading-layout">
        {/* Left Column: Problem Details reading flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Statement */}
          <section className="reading-section">
            <h3 className="reading-section-title">Problem Statement</h3>
            <div className="reading-body text-pre-wrap" style={{ marginTop: '8px' }}>
              {problem.problemStatement}
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-strong)' }} />

          {/* Constraints */}
          {problem.constraints && problem.constraints.length > 0 && (
            <section className="reading-section">
              <h3 className="reading-section-title">Constraints</h3>
              <div className="reading-constraints-stack" style={{ marginTop: '8px' }}>
                {problem.constraints.map((c, idx) => (
                  <div key={idx} className="reading-constraint-item">
                    {c}
                  </div>
                ))}
              </div>
            </section>
          )}

          {problem.constraints && problem.constraints.length > 0 && (
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-strong)' }} />
          )}

          {/* Examples */}
          {problem.examples && problem.examples.length > 0 && (
            <section className="reading-section">
              <h3 className="reading-section-title">Examples</h3>
              <div className="reading-examples-stack" style={{ marginTop: '12px' }}>
                {problem.examples.map((ex, idx) => (
                  <div key={idx} className="reading-example-card">
                    <h4 className="reading-example-title">Example {idx + 1}</h4>
                    <p style={{ fontSize: '13px' }}>
                      <strong>Input:</strong> <code>{ex.input}</code>
                    </p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>
                      <strong>Output:</strong> <code>{ex.output}</code>
                    </p>
                    {ex.explanation && (
                      <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                        <strong>Explanation:</strong> {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {problem.examples && problem.examples.length > 0 && (
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-strong)' }} />
          )}

          {/* Submitted code */}
          {problem.code && (
            <section className="reading-section">
              <h3 className="reading-section-title">Code Submitted</h3>
              <div style={{ marginTop: '12px' }}>
                <CodeBlock code={problem.code} language={problem.language} />
              </div>
            </section>
          )}

          {problem.code && (
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-strong)' }} />
          )}

          {/* Analysis History Section */}
          <section className="reading-section" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '8px' }}>
              <h3 className="reading-section-title" style={{ border: 'none', paddingBottom: '0', margin: '0' }}>Analysis History</h3>
              {analyses.length > 1 && (
                <button
                  type="button"
                  disabled={selectedAttempts.length !== 2}
                  onClick={() => {
                    const sorted = [...selectedAttempts].sort((a, b) => {
                      const firstIdx = analyses.findIndex(x => x._id === a);
                      const secondIdx = analyses.findIndex(x => x._id === b);
                      return secondIdx - firstIdx;
                    });
                    navigate(`/problems/${problemId}/analyses/compare?first=${sorted[0]}&second=${sorted[1]}`);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Compare attempts ({selectedAttempts.length}/2)
                </button>
              )}
            </div>

            {analysesLoading ? (
              <div style={{ padding: '24px 0' }}>
                <Loader text="Loading attempts timeline..." />
              </div>
            ) : analyses.length === 0 ? (
              <div className="empty-state-container" style={{ padding: '32px 24px' }}>
                <span className="empty-state-title">No attempts recorded</span>
                <span className="empty-state-description">
                  Generate your first analysis report for this problem specification.
                </span>
                <div className="empty-state-action">
                  <button onClick={handleGenerate} className="btn btn-primary btn-sm icon-btn">
                    <Play size={12} />
                    <span>Run first analysis</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {analyses.map((attempt, idx) => {
                  const attemptNum = analyses.length - idx;
                  const reqCount = attempt.requestedSections?.length || 0;
                  const tokenCount = attempt.usage?.totalTokens || 0;

                  return (
                    <div
                      key={attempt._id}
                      className="preview-card-item"
                      style={{
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                        borderLeft: selectedAttempts.includes(attempt._id) ? '4px solid var(--primary)' : '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {attempt.status === 'completed' ? (
                          <input
                            type="checkbox"
                            checked={selectedAttempts.includes(attempt._id)}
                            onChange={() => handleToggleSelectAttempt(attempt._id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            disabled
                            style={{ cursor: 'not-allowed', width: '16px', height: '16px', opacity: 0.5 }}
                            title="Only completed attempts can be compared"
                          />
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                              Attempt {attemptNum}
                            </strong>
                            <StatusBadge status={attempt.status} />
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              <span>{new Date(attempt.createdAt).toLocaleDateString()}</span>
                            </span>
                            {attempt.modelName && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Cpu size={12} />
                                <span>{attempt.modelName}</span>
                              </span>
                            )}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Layers size={12} />
                              <span>{reqCount} modules</span>
                            </span>
                            {tokenCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Award size={12} />
                                <span>{tokenCount} tokens</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {attempt.status === 'completed' && (
                          <Link to={`/analyses/${attempt._id}`} className="btn btn-secondary btn-sm">
                            Open report
                          </Link>
                        )}
                        {attempt.status === 'failed' && (
                          <span style={{ fontSize: '12px', color: 'var(--danger)', marginRight: '8px' }}>
                            Failed
                          </span>
                        )}
                        {attempt.status === 'processing' && (
                          <span style={{ fontSize: '12px', color: 'var(--warning)', marginRight: '8px' }}>
                            Processing...
                          </span>
                        )}
                        {attempt.status === 'queued' && (
                          <span style={{ fontSize: '12px', color: 'var(--primary)', marginRight: '8px' }}>
                            Queued...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Summary rail */}
        <aside className="summary-rail-card">
          <div className="rail-section">
            <span className="rail-label">Status</span>
            <span className="rail-value">
              <StatusBadge status={problem.status} />
            </span>
          </div>

          <div className="rail-section">
            <span className="rail-label">Language</span>
            <span className="rail-value">{getLanguageLabel(problem.language)}</span>
          </div>

          <div className="rail-section">
            <span className="rail-label">Modules Selected</span>
            <span className="rail-value">{problem.requestedSections?.length || 0} modules</span>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to={`/problems/${problem._id}/edit`} className="btn btn-secondary btn-block icon-btn">
              <Edit3 size={14} />
              <span>Edit problem</span>
            </Link>

            {(normalizedStatus === 'draft' || normalizedStatus === 'failed') && (
              <button onClick={handleGenerate} disabled={actionLoading} className="btn btn-primary btn-block">
                <Play size={14} />
                <span>Analyse problem</span>
              </button>
            )}

            {normalizedStatus === 'completed' && (
              <>
                <button onClick={handleViewLatest} disabled={actionLoading} className="btn btn-primary btn-block">
                  <ExternalLink size={14} />
                  <span>View latest</span>
                </button>
                <button onClick={handleGenerate} disabled={actionLoading} className="btn btn-secondary btn-block">
                  <RotateCw size={14} />
                  <span>Re-analyse</span>
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
export { ProblemDetailPage };
