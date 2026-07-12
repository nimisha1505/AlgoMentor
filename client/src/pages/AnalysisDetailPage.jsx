import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysisById } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, BookOpen, Clock, Cpu, Activity, Award } from 'lucide-react';

const AnalysisDetailPage = () => {
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealedLevel, setRevealedLevel] = useState(1);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getAnalysisById(analysisId);
        setAnalysis(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysis();
  }, [analysisId]);

  if (isLoading) {
    return (
      <div className="loader-container" style={{ minHeight: '50vh' }}>
        <Loader text="Retrieving AI mentor report..." />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="analysis-detail-container container">
        <div className="detail-header-nav" style={{ marginBottom: '16px' }}>
          <Link to="/problems" className="back-link">
            <ArrowLeft size={14} /> My Problems
          </Link>
        </div>
        <FormError message={error || 'Failed to locate analysis.'} />
      </div>
    );
  }

  const result = analysis.result || {};
  const status = (analysis.status || '').toLowerCase();

  // Dynamic sidenav items builder
  const getSidenavItems = () => {
    const items = [];
    if (result.problemExplanation || result.inputOutput) {
      items.push({ id: 'overview', label: 'Overview' });
    }
    if (result.exampleExplanation && result.exampleExplanation.length > 0) {
      items.push({ id: 'examples', label: 'Examples' });
    }
    if (result.pattern) {
      items.push({ id: 'pattern', label: 'Pattern' });
    }
    if (result.hints && result.hints.length > 0) {
      items.push({ id: 'hints', label: 'Hints' });
    }
    if (result.pseudocode && result.pseudocode.length > 0) {
      items.push({ id: 'pseudocode', label: 'Pseudocode' });
    }
    if (result.approaches && result.approaches.length > 0) {
      items.push({ id: 'approaches', label: 'Approaches' });
    }
    if (result.codes && result.codes.length > 0) {
      items.push({ id: 'code', label: 'Code' });
    }
    if (result.complexities && result.complexities.length > 0) {
      items.push({ id: 'complexity', label: 'Complexity' });
    }
    if (result.dryRun) {
      items.push({ id: 'dryrun', label: 'Dry run' });
    }
    if (result.comparison && result.comparison.length > 0) {
      items.push({ id: 'comparison', label: 'Comparison' });
    }
    if (result.userCodeReview) {
      items.push({ id: 'codereview', label: 'Code review' });
    }
    if (result.interviewExplanation) {
      items.push({ id: 'interview', label: 'Interview answer' });
    }
    return items;
  };

  const sidenavItems = getSidenavItems();

  const handleScroll = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="analysis-detail-container container">
      {/* Top Bar navigation */}
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
          <ArrowLeft size={14} /> My Problems
        </Link>
        {analysis.problem && (
          <Link to={`/problems/${analysis.problem}`} className="back-link">
            <BookOpen size={14} /> Back to problem
          </Link>
        )}
      </div>

      {/* Header metadata block */}
      <header className="analysis-header-banner">
        <div className="analysis-banner-title-row">
          <div className="analysis-banner-title-block">
            <span className="analysis-banner-label">Your analysis is ready</span>
            <h1 className="analysis-banner-title" style={{ fontSize: '28px' }}>
              {analysis.inputSnapshot?.title || 'DSA Mentorship'}
            </h1>
          </div>
          <StatusBadge status={analysis.status} />
        </div>

        <div className="analysis-meta-strip">
          {analysis.modelName && (
            <div className="analysis-meta-block">
              <Cpu size={12} />
              <span>Model: <strong>{analysis.modelName}</strong></span>
            </div>
          )}
          {analysis.usage && (
            <div className="analysis-meta-block">
              <Activity size={12} />
              <span>
                Tokens: <strong>{analysis.usage.totalTokens || 0}</strong>
              </span>
            </div>
          )}
          <div className="analysis-meta-block">
            <Clock size={12} />
            <span>Updated: {new Date(analysis.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Compact Progress summary bar */}
        {status === 'completed' && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginTop: '16px',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
            }}
          >
            <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Modules active:</span>
            {sidenavItems.map((item, idx) => (
              <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--accent)' }}>✓</span>
                <span>{item.label}</span>
                {idx < sidenavItems.length - 1 && <span style={{ color: 'var(--text-muted)' }}>|</span>}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Main Workspace structure */}
      <div className="analysis-detail-workspace-layout" style={{ marginTop: '32px' }}>
        {/* Left Sticky navigation column */}
        {status === 'completed' && sidenavItems.length > 0 && (
          <aside className="analysis-left-sidenav">
            <span className="sidenav-title">Lesson navigation</span>
            {sidenavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleScroll(item.id)}
                className="sidenav-link"
                style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
              >
                {item.label}
              </button>
            ))}
          </aside>
        )}

        {/* Central Lesson column (720px - 800px) */}
        <div className="analysis-right-content">
          {status === 'failed' && (
            <div className="analysis-failure-box" role="alert">
              <h3 className="fail-title" style={{ color: 'var(--danger)' }}>Analysis Failed</h3>
              <p className="fail-message">{analysis.errorMessage || 'Report generation was interrupted.'}</p>
            </div>
          )}

          {(status === 'queued' || status === 'processing') && (
            <div className="analysis-status-card">
              <div className="spinner"></div>
              <h3 className="status-card-title">Building your analysis</h3>
              <p className="status-card-desc">
                AlgoMentor is constructing hints, strategies, and reviews.
              </p>
            </div>
          )}

          {status === 'completed' && (
            <>
              {/* Overview */}
              {(result.problemExplanation || result.inputOutput) && (
                <section id="overview" className="learning-section">
                  <h3 className="learning-section-title">Overview</h3>
                  {result.problemExplanation && (
                    <p className="learning-body-text">{result.problemExplanation}</p>
                  )}
                  {result.inputOutput && (
                    <div style={{ marginTop: '16px' }}>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        Input & Output structure
                      </strong>
                      <p className="learning-body-text">{result.inputOutput}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Examples */}
              {result.exampleExplanation && result.exampleExplanation.length > 0 && (
                <section id="examples" className="learning-section">
                  <h3 className="learning-section-title">Examples</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {result.exampleExplanation.map((ex, idx) => (
                      <div key={idx} className="preview-card-item" style={{ padding: '16px' }}>
                        <strong style={{ fontSize: '13px', display: 'block', color: 'var(--accent)', marginBottom: '6px' }}>
                          Example {ex.exampleNumber} Walkthrough
                        </strong>
                        <p className="learning-body-text">{ex.explanation}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Pattern */}
              {result.pattern && (
                <section id="pattern" className="learning-section">
                  <h3 className="learning-section-title">Pattern to recognise</h3>
                  <div className="say-in-interview-callout" style={{ backgroundColor: '#f5f3ff', borderLeftColor: '#8b5cf6' }}>
                    <span className="callout-title" style={{ color: '#8b5cf6' }}>Identified Strategy Pattern</span>
                    <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                      {result.pattern.name}
                    </strong>
                    <p className="learning-body-text" style={{ fontSize: '13px', marginTop: '6px' }}>
                      {result.pattern.reason}
                    </p>
                    {result.pattern.clues && result.pattern.clues.length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid #ddd6fe', paddingTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: '#7c3aed' }}>
                          Key clues in problem description
                        </span>
                        <ul style={{ paddingLeft: '20px', marginTop: '4px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {result.pattern.clues.map((clue, idx) => (
                            <li key={idx}>{clue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Hints with Progressive Reveal */}
              {result.hints && result.hints.length > 0 && (
                <section id="hints" className="learning-section">
                  <h3 className="learning-section-title">Progressive hints</h3>
                  <p className="card-subtitle-text" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '-8px', marginBottom: '8px' }}>
                    Explore hints progressively to build intuition without spoiling solutions.
                  </p>
                  <div className="hint-progression-panel">
                    {[...result.hints]
                      .sort((a, b) => a.level - b.level)
                      .map((h) => {
                        const level = h.level;
                        const isRevealed = level <= revealedLevel;
                        
                        let label = 'Gentle nudge';
                        if (level === 2) label = 'Stronger direction';
                        if (level === 3) label = 'Almost there';

                        return (
                          <div key={level} className="hint-progress-step-card">
                            <div className="hint-step-header">
                              <span>Hint {level}</span>
                              <StatusBadge status={isRevealed ? 'COMPLETED' : 'QUEUED'} />
                            </div>
                            
                            {isRevealed ? (
                              <div className="hint-step-body">{h.hint}</div>
                            ) : (
                              <div className="hint-lock-overlay">
                                <button
                                  type="button"
                                  onClick={() => setRevealedLevel(level)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Reveal {label}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </section>
              )}

              {/* Pseudocode */}
              {result.pseudocode && result.pseudocode.length > 0 && (
                <section id="pseudocode" className="learning-section">
                  <h3 className="learning-section-title">Pseudocode</h3>
                  <div className="monospace-block">
                    {result.pseudocode.map((line, idx) => (
                      <div key={idx} className="pseudocode-line">
                        <span className="line-num">{idx + 1}</span>
                        <span className="line-text">{line}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Approaches (Progressive Naive -> Optimal) */}
              {result.approaches && result.approaches.length > 0 && (
                <section id="approaches" className="learning-section">
                  <h3 className="learning-section-title">Approaches</h3>
                  <div className="progression-stack">
                    {result.approaches.map((ap, idx) => {
                      const isOptimal = (ap.category || '').toLowerCase().includes('optimal');

                      return (
                        <div key={idx} className={`progression-card ${isOptimal ? 'optimal' : ''}`}>
                          <div className="progression-header">
                            <span className="progression-label">
                              {isOptimal ? 'Optimal Strategy' : (ap.category || 'Approach')}
                            </span>
                            <span className="progression-name" style={{ fontSize: '15px', fontWeight: '700' }}>
                              {ap.name}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', margin: '6px 0', color: 'var(--text-secondary)' }}>
                            <span>Time Bound: <code style={{ fontWeight: '600' }}>{ap.timeComplexity}</code></span>
                            <span>Space Bound: <code style={{ fontWeight: '600' }}>{ap.spaceComplexity}</code></span>
                          </div>

                          <p style={{ fontSize: '13px', marginTop: '6px' }}>
                            <strong>Intuition:</strong> {ap.intuition}
                          </p>

                          {ap.steps && ap.steps.length > 0 && (
                            <div style={{ fontSize: '13px', marginTop: '8px' }}>
                              <strong>Steps:</strong>
                              <ol style={{ paddingLeft: '20px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {ap.steps.map((step, sIdx) => (
                                  <li key={sIdx}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {ap.code && (
                            <div style={{ marginTop: '12px' }}>
                              <CodeBlock code={ap.code} language={analysis.inputSnapshot?.language} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Reference Code solutions */}
              {result.codes && result.codes.length > 0 && (
                <section id="code" className="learning-section">
                  <h3 className="learning-section-title">Code solutions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {result.codes.map((sol, idx) => (
                      <div key={idx}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--accent)' }}>
                          {sol.approach}
                        </h4>
                        <CodeBlock code={sol.code} language={sol.language} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Complexity (Why explanation) */}
              {result.complexities && result.complexities.length > 0 && (
                <section id="complexity" className="learning-section">
                  <h3 className="learning-section-title">Complexity analysis</h3>
                  <div className="complexity-panels-grid">
                    {result.complexities.map((comp, idx) => (
                      <div key={idx} className="complexity-panel">
                        <span className="complexity-panel-title">{comp.approach}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                          <div>
                            <span className="complexity-value">Time: {comp.timeComplexity}</span>
                            <p className="complexity-desc" style={{ fontSize: '12px', marginTop: '2px' }}>{comp.timeReason}</p>
                          </div>
                          <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '8px', marginTop: '4px' }}>
                            <span className="complexity-value">Space: {comp.spaceComplexity}</span>
                            <p className="complexity-desc" style={{ fontSize: '12px', marginTop: '2px' }}>{comp.spaceReason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Dry Run Tracing */}
              {result.dryRun && (
                <section id="dryrun" className="learning-section">
                  <h3 className="learning-section-title">Dry run trace</h3>
                  <div className="nested-card">
                    <p style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                      Trace Strategy: <strong>{result.dryRun.approach}</strong> | Input: <code>{result.dryRun.input}</code>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      {result.dryRun.steps?.map((step, idx) => (
                        <div key={idx} className="dry-run-step-block">
                          <span className="dry-run-num-badge">{idx + 1}</span>
                          <span className="dry-run-text">{step}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '13px', fontWeight: '600' }}>
                      Output values computed: <code>{result.dryRun.output}</code>
                    </div>
                  </div>
                </section>
              )}

              {/* Compare approaches table */}
              {result.comparison && result.comparison.length > 0 && (
                <section id="comparison" className="learning-section">
                  <h3 className="learning-section-title">Compare approaches</h3>
                  <div className="comparison-table-wrapper">
                    <table className="comparison-table-view">
                      <thead>
                        <tr>
                          <th>Approach</th>
                          <th>Time</th>
                          <th>Space</th>
                          <th>Advantages</th>
                          <th>Disadvantages</th>
                          <th>Suitability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.comparison.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600' }}>{row.approach}</td>
                            <td><code>{row.timeComplexity}</code></td>
                            <td><code>{row.spaceComplexity}</code></td>
                            <td>
                              <ul className="bullet-td-list">
                                {row.advantages?.map((adv, aIdx) => <li key={aIdx}>{adv}</li>)}
                              </ul>
                            </td>
                            <td>
                              <ul className="bullet-td-list">
                                {row.disadvantages?.map((dis, dIdx) => <li key={dIdx}>{dis}</li>)}
                              </ul>
                            </td>
                            <td>{row.interviewSuitability}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Code Review */}
              {result.userCodeReview && (
                <section id="codereview" className="learning-section">
                  <h3 className="learning-section-title">Code review</h3>
                  <div className="code-review-redesign">
                    <div className="review-correctness-strip">
                      <span>Submitted logic status</span>
                      <span className={result.userCodeReview.isCorrect ? 'correct-true' : 'correct-false'}>
                        {result.userCodeReview.isCorrect ? 'Logic Correct' : 'Inefficient / Has Bugs'}
                      </span>
                    </div>

                    <div className="review-section-block">
                      <span className="review-section-block-title">What you did well</span>
                      <p className="learning-body-text">{result.userCodeReview.summary}</p>
                    </div>

                    {result.userCodeReview.strengths && result.userCodeReview.strengths.length > 0 && (
                      <div className="review-section-block">
                        <span className="review-section-block-title">Key Strengths</span>
                        <ul className="review-list-bullets">
                          {result.userCodeReview.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                        </ul>
                      </div>
                    )}

                    {result.userCodeReview.bugs && result.userCodeReview.bugs.length > 0 && (
                      <div className="review-section-block">
                        <span className="review-section-block-title">Problems found</span>
                        <ul className="review-list-bullets warning">
                          {result.userCodeReview.bugs.map((bug, idx) => <li key={idx}>{bug}</li>)}
                        </ul>
                      </div>
                    )}

                    {result.userCodeReview.missedEdgeCases && result.userCodeReview.missedEdgeCases.length > 0 && (
                      <div className="review-section-block">
                        <span className="review-section-block-title">Missed edge cases</span>
                        <ul className="review-list-bullets warning">
                          {result.userCodeReview.missedEdgeCases.map((ec, idx) => <li key={idx}>{ec}</li>)}
                        </ul>
                      </div>
                    )}

                    {result.userCodeReview.improvements && result.userCodeReview.improvements.length > 0 && (
                      <div className="review-section-block">
                        <span className="review-section-block-title">Improvements</span>
                        <ul className="review-list-bullets">
                          {result.userCodeReview.improvements.map((imp, idx) => <li key={idx}>{imp}</li>)}
                        </ul>
                      </div>
                    )}

                    {result.userCodeReview.correctedCode && (
                      <div className="review-section-block">
                        <span className="review-section-block-title">Corrected code version</span>
                        <CodeBlock
                          code={result.userCodeReview.correctedCode}
                          language={analysis.inputSnapshot?.language}
                        />
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Interview explanation guide callout */}
              {result.interviewExplanation && (
                <section id="interview" className="learning-section">
                  <h3 className="learning-section-title">Interview answer</h3>
                  <div className="say-in-interview-callout">
                    <span className="callout-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Award size={14} />
                      How to explain this in an interview
                    </span>
                    <div className="callout-body text-pre-wrap">{result.interviewExplanation}</div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisDetailPage;
export { AnalysisDetailPage };
