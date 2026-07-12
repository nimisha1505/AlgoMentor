import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysisById, createAnalysisFollowUp, getAnalysisFollowUps } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, BookOpen, Clock, Cpu, Activity, Award, MessageSquare, Send, Sparkles } from 'lucide-react';

const AnalysisDetailPage = () => {
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Reveal state persisted key
  const storageKey = `algomentor-analysis-reveal-${analysisId}`;

  // Reveal state values (hint progress & solution toggle)
  const [solutionRevealed, setSolutionRevealed] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return !!JSON.parse(cached).solutionRevealed;
      }
    } catch (e) {}
    return false;
  });

  const [revealedLevel, setRevealedLevel] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return JSON.parse(cached).revealedLevel || 1;
      }
    } catch (e) {}
    return 1;
  });

  const saveState = (level, solRevealed) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ revealedLevel: level, solutionRevealed: solRevealed }));
    } catch (e) {}
  };

  // Follow-up QA workspace states
  const [followUps, setFollowUps] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [followUpMode, setFollowUpMode] = useState('explain');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState('');

  useEffect(() => {
    const fetchAnalysisAndFollowUps = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getAnalysisById(analysisId);
        setAnalysis(data);

        if (data && data.status === 'completed') {
          const history = await getAnalysisFollowUps(analysisId);
          setFollowUps(history || []);
        }
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysisAndFollowUps();
  }, [analysisId]);

  const handleAskMentor = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setIsSubmittingFollowUp(true);
    setFollowUpError('');
    try {
      const result = await createAnalysisFollowUp(analysisId, {
        question: newQuestion.trim(),
        mode: followUpMode,
      });
      setFollowUps((prev) => [...prev, result]);
      setNewQuestion('');
    } catch (err) {
      setFollowUpError(getApiErrorMessage(err));
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleChipClick = (questionText, targetMode) => {
    setNewQuestion(questionText);
    setFollowUpMode(targetMode);
  };

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
  const totalHints = result.hints?.length || 0;

  // Sidenav items filtered dynamically based on reveal state
  const getSidenavItems = () => {
    const items = [];
    if (result.problemExplanation || result.inputOutput) {
      items.push({ id: 'overview', label: 'Overview' });
    }
    if (result.exampleExplanation && result.exampleExplanation.length > 0) {
      items.push({ id: 'examples', label: 'Examples' });
    }
    if (result.missingEdgeCases && result.missingEdgeCases.length > 0) {
      items.push({ id: 'missingedgecases', label: 'Missing edge cases' });
    }
    if (result.pattern) {
      items.push({ id: 'pattern', label: 'Pattern' });
    }
    if (result.hints && result.hints.length > 0) {
      items.push({ id: 'hints', label: 'Hints' });
    }
    if (result.userCodeReview) {
      items.push({ id: 'codereview', label: 'Code review' });
    }
    if (result.approachImprovement) {
      items.push({ id: 'approachimprovement', label: 'Improve approach' });
    }

    if (solutionRevealed) {
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
    } else {
      items.push({ id: 'locked-solution', label: 'Full solution [Locked]' });
    }

    if (result.interviewExplanation) {
      items.push({ id: 'interview', label: 'Interview answer' });
    }

    // Always append follow-up navigation
    items.push({ id: 'mentor-qa', label: 'Ask AlgoMentor' });

    return items;
  };

  const sidenavItems = getSidenavItems();

  const handleScroll = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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

  const getModeLabel = (modeVal) => {
    const labels = {
      explain: 'Explain simply',
      hint: 'Next Hint',
      improve: 'Improve Approach',
      edgeCase: 'Edge Case analysis',
      interview: 'Interview Coach',
    };
    return labels[modeVal] || modeVal;
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
          {analysis.inputSnapshot?.language && (
            <div className="analysis-meta-block">
              <span>Lang: <strong>{getLanguageLabel(analysis.inputSnapshot.language)}</strong></span>
            </div>
          )}
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
              backgroundColor: 'var(--bg-soft)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
            }}
          >
            <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Modules active:</span>
            {sidenavItems.map((item, idx) => (
              <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--primary)' }}>✓</span>
                <span>{item.label}</span>
                {idx < sidenavItems.length - 1 && <span style={{ color: 'var(--border-strong)' }}>|</span>}
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
                        <strong style={{ fontSize: '13px', display: 'block', color: 'var(--primary)', marginBottom: '6px' }}>
                          Example {ex.exampleNumber} Walkthrough
                        </strong>
                        <p className="learning-body-text">{ex.explanation}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Missing Edge Cases */}
              {result.missingEdgeCases && result.missingEdgeCases.length > 0 && (
                <section id="missingedgecases" className="learning-section">
                  <h3 className="learning-section-title">Edge cases you may have missed</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {result.missingEdgeCases.map((ec, idx) => (
                      <div key={idx} className="hint-progress-step-card" style={{ borderLeft: '4px solid var(--warning)' }}>
                        <div className="hint-step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>Case {idx + 1}: {ec.case}</span>
                          {ec.testInput && (
                            <code style={{ fontSize: '11px', backgroundColor: 'var(--bg-soft)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                              Input: {ec.testInput}
                            </code>
                          )}
                        </div>
                        <div className="hint-step-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <p className="learning-body-text">
                            <strong>Why it matters:</strong> {ec.whyItMatters}
                          </p>
                          <p className="learning-body-text" style={{ color: 'var(--danger)' }}>
                            <strong>How it breaks current approach:</strong> {ec.howItBreaksCurrentApproach}
                          </p>
                        </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <p className="card-subtitle-text" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Explore hints progressively to build intuition without spoiling solutions.
                    </p>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)' }}>
                      {Math.min(revealedLevel, totalHints)} of {totalHints} hints revealed
                    </span>
                  </div>
                  
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
                                  onClick={() => {
                                    setRevealedLevel(level);
                                    saveState(level, solutionRevealed);
                                  }}
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

                  {!solutionRevealed && (
                    <div style={{ marginTop: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSolutionRevealed(true);
                          saveState(revealedLevel, true);
                        }}
                        className="clear-text-btn"
                        style={{ color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        I want to see the solution
                      </button>
                    </div>
                  )}
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

              {/* Approach Improvement */}
              {result.approachImprovement && (
                <section id="approachimprovement" className="learning-section">
                  <h3 className="learning-section-title">How to improve your approach</h3>
                  <div className="code-review-redesign" style={{ gap: '20px' }}>
                    {result.approachImprovement.currentStrengths && result.approachImprovement.currentStrengths.length > 0 && (
                      <div className="review-section-block">
                        <span className="review-section-block-title" style={{ color: 'var(--success)' }}>Strengths</span>
                        <ul className="review-list-bullets">
                          {result.approachImprovement.currentStrengths.map((str, idx) => (
                            <li key={idx}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.approachImprovement.bottlenecks && result.approachImprovement.bottlenecks.length > 0 && (
                      <div className="review-section-block">
                        <span className="review-section-block-title" style={{ color: 'var(--danger)' }}>Bottlenecks identified</span>
                        <ul className="review-list-bullets warning">
                          {result.approachImprovement.bottlenecks.map((bn, idx) => (
                            <li key={idx}>{bn}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.approachImprovement.unnecessaryWork && result.approachImprovement.unnecessaryWork.length > 0 && (
                      <div className="review-section-block">
                        <span className="review-section-block-title" style={{ color: 'var(--warning)' }}>Unnecessary work</span>
                        <ul className="review-list-bullets warning">
                          {result.approachImprovement.unnecessaryWork.map((uw, idx) => (
                            <li key={idx}>{uw}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.approachImprovement.nextImprovement && (
                      <div className="review-section-block">
                        <span className="review-section-block-title">Next improvement step</span>
                        <p className="learning-body-text">{result.approachImprovement.nextImprovement}</p>
                      </div>
                    )}

                    {result.approachImprovement.improvedApproach && (
                      <div className="review-section-block">
                        <span className="review-section-block-title">Recommended target approach</span>
                        <p className="learning-body-text">{result.approachImprovement.improvedApproach}</p>
                      </div>
                    )}

                    {result.approachImprovement.patternToLearn && (
                      <div className="review-section-block">
                        <span className="review-section-block-title" style={{ color: 'var(--ai-accent)' }}>Pattern or concept to study</span>
                        <div style={{ backgroundColor: 'var(--ai-soft)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--ai-accent)', fontSize: '13px' }}>
                          {result.approachImprovement.patternToLearn}
                        </div>
                      </div>
                    )}

                    {result.approachImprovement.questionsToAsk && result.approachImprovement.questionsToAsk.length > 0 && (
                      <div className="review-section-block">
                        <span className="review-section-block-title">Reflective questions to ask yourself</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          {result.approachImprovement.questionsToAsk.map((q, idx) => (
                            <label key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                              <input type="checkbox" style={{ marginTop: '3px' }} />
                              <span>{q}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Solution Sections Gate */}
              {solutionRevealed ? (
                <>
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
                </>
              ) : (
                /* Compact Locked Learning Panel */
                <section id="locked-solution" className="learning-section">
                  <div className="empty-state-container" style={{ padding: '32px', border: '1px dashed var(--border-strong)', background: 'var(--bg-soft)', margin: '0' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Ready to see the full solution?</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Try the hints and think through your approach first.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      {revealedLevel < totalHints && (
                        <button
                          onClick={() => {
                            const next = Math.min(revealedLevel + 1, totalHints);
                            setRevealedLevel(next);
                            saveState(next, false);
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Reveal next hint
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSolutionRevealed(true);
                          saveState(revealedLevel, true);
                        }}
                        className="btn btn-primary btn-sm animate-pulse"
                      >
                        Show full solution
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Interview Answer */}
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

              {/* PART H: Follow-Up Questions Mentor Discussion Panel */}
              <section id="mentor-qa" className="learning-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '32px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} style={{ color: 'var(--ai-accent)' }} />
                  <h3 className="learning-section-title" style={{ border: 'none', padding: '0', margin: '0' }}>Ask AlgoMentor</h3>
                </div>
                <p className="card-subtitle-text" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '-8px' }}>
                  Ask about a hint, edge case, approach, complexity, or interview explanation.
                </p>

                {/* Follow up history conversation entries */}
                {followUps.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '16px 0' }}>
                    {followUps.map((item, idx) => (
                      <div key={item._id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '8px', fontSize: '12px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                            Student Question:
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {getModeLabel(item.mode)} • {new Date(item.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{item.question}"</p>
                        
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'flex-start' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--ai-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                            AI
                          </div>
                          <div>
                            <span style={{ fontWeight: '600', fontSize: '12px', display: 'block', marginBottom: '4px' }}>AlgoMentor Response</span>
                            <div className="learning-body-text text-pre-wrap" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                              {item.answer}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested question chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => handleChipClick('Why is this approach optimal?', 'explain')}
                    className="preset-chip-btn"
                    type="button"
                  >
                    Why is this approach optimal?
                  </button>
                  <button
                    onClick={() => handleChipClick('Which edge case am I missing?', 'edgeCase')}
                    className="preset-chip-btn"
                    type="button"
                  >
                    Which edge case am I missing?
                  </button>
                  {revealedLevel < totalHints && (
                    <button
                      onClick={() => handleChipClick('Give me one more hint', 'hint')}
                      className="preset-chip-btn"
                      type="button"
                    >
                      Give me one more hint
                    </button>
                  )}
                  <button
                    onClick={() => handleChipClick('How can I explain this in an interview?', 'interview')}
                    className="preset-chip-btn"
                    type="button"
                  >
                    How can I explain this in an interview?
                  </button>
                  <button
                    onClick={() => handleChipClick('How can I improve my code?', 'improve')}
                    className="preset-chip-btn"
                    type="button"
                  >
                    How can I improve my code?
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handleAskMentor} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                  <FormError message={followUpError} />
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {['explain', 'hint', 'improve', 'edgeCase', 'interview'].map((m) => (
                      <label key={m} className="checkbox-chip-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="radio"
                          name="followUpMode"
                          checked={followUpMode === m}
                          onChange={() => setFollowUpMode(m)}
                          disabled={isSubmittingFollowUp}
                        />
                        <span style={followUpMode === m ? { color: 'var(--ai-accent)', fontWeight: '600' } : {}}>
                          {getModeLabel(m)}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="form-group">
                    <textarea
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Ask the AI mentor to elaborate on a concept, provide code suggestions, or test inputs..."
                      maxLength={2000}
                      required
                      rows={3}
                      disabled={isSubmittingFollowUp}
                      style={{ padding: '12px', minHeight: '80px', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {newQuestion.length}/2000 characters
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingFollowUp || !newQuestion.trim()}
                      className="btn btn-primary btn-sm icon-btn"
                      style={{ padding: '8px 16px' }}
                    >
                      {isSubmittingFollowUp ? (
                        <>
                          <div className="spinner" style={{ width: '12px', height: '12px', borderThickness: '1px' }}></div>
                          <span>Thinking...</span>
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Ask AlgoMentor</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisDetailPage;
export { AnalysisDetailPage };
