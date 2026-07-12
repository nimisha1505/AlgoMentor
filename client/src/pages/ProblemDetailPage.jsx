import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProblemById } from '../api/problem.api.js';
import { startProblemAnalysis, getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, Play, ExternalLink, RotateCw, Calendar, Layers } from 'lucide-react';

const ProblemDetailPage = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getProblemById(problemId);
        setProblem(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchProblem();
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
              <span>View Analysis</span>
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

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-muted)' }} />

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
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-muted)' }} />
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
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-muted)' }} />
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
                  <span>View analysis</span>
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
