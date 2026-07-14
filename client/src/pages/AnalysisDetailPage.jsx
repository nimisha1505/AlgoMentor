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
    <div className="analysis-detail-container container" style={{ paddingBottom: '80px' }}>
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
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link to="/problems" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
            <ArrowLeft size={14} /> My Problems
          </Link>
          {analysis.problem && (
            <Link to={`/problems/${analysis.problem}`} className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
              <BookOpen size={14} /> View Details
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/analyses/new" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: '600' }}>
            Analyse Again
          </Link>
          <Link to="/problems" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: '600' }}>
            History
          </Link>
        </div>
      </div>

      {/* Header metadata block */}
      <header className="analysis-header-banner" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div className="analysis-banner-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="analysis-banner-title-block">
            <span className="analysis-banner-label" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
              Personalised DSA Lesson
            </span>
            <h1 className="analysis-banner-title" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>
              {analysis.inputSnapshot?.title || 'Untitled DSA Problem'}
            </h1>
          </div>
          <StatusBadge status={analysis.status} />
        </div>

        <div className="analysis-meta-strip" style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          {analysis.inputSnapshot?.language && (
            <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Language: <strong>{getLanguageLabel(analysis.inputSnapshot.language)}</strong></span>
            </div>
          )}
          {analysis.inputSnapshot?.difficulty && (
            <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Difficulty: <strong style={{ textTransform: 'capitalize' }}>{analysis.inputSnapshot.difficulty}</strong></span>
            </div>
          )}
          {analysis.modelName && (
            <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Cpu size={12} />
              <span>Model: <strong>{analysis.modelName}</strong></span>
            </div>
          )}
          <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            <span>Updated: {new Date(analysis.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* Guided steps progression timeline */}
      {status === 'completed' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', margin: '20px 0', overflowX: 'auto' }}>
          {[
            { key: 'overview', label: '1. Start Here' },
            { key: 'pattern', label: '2. Pattern' },
            { key: 'missingedgecases', label: '3. Edge Cases' },
            { key: 'hints', label: '4. Hints' },
            { key: 'codereview', label: '5. Review' },
            { key: 'locked-solution', label: '6. Solution' }
          ].map((step, idx) => {
            const isAvailable = sidenavItems.some(i => i.id === step.key || (step.key === 'locked-solution' && (i.id === 'locked-solution' || i.id === 'code' || i.id === 'pseudocode' || i.id === 'complexity')));
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isAvailable ? 1 : 0.4, color: isAvailable ? 'var(--primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                <span style={{ color: isAvailable ? 'var(--primary)' : 'inherit' }}>{step.label}</span>
                {idx < 5 && <span style={{ color: 'var(--border)', marginLeft: '8px' }}>→</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Workspace structure */}
      <div className="analysis-detail-workspace-layout" style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Left Sticky navigation column */}
        {status === 'completed' && sidenavItems.length > 0 && (
          <aside className="analysis-left-sidenav" style={{ position: 'sticky', top: '72px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="sidenav-title" style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>
              Lesson Modules
            </span>
            {sidenavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleScroll(item.id)}
                className="sidenav-link"
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  display: 'block',
                  transition: 'background 0.15s ease'
                }}
              >
                {item.label}
              </button>
            ))}
          </aside>
        )}

        {/* Central Lesson column */}
        <div className="analysis-right-content" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {status === 'failed' && (
            <div className="analysis-failure-box" role="alert" style={{ padding: '24px', backgroundColor: 'var(--danger-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h3 className="fail-title" style={{ color: 'var(--danger)', margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800' }}>Analysis Failed</h3>
              <p className="fail-message" style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>{analysis.errorMessage || 'Report generation was interrupted.'}</p>
            </div>
          )}

          {(status === 'queued' || status === 'processing') && (
            <div className="analysis-status-card" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
              <h3 className="status-card-title" style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800' }}>Building your analysis</h3>
              <p className="status-card-desc" style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                AlgoMentor is constructing hints, strategies, and reviews.
              </p>
            </div>
          )}

          {status === 'completed' && (
            <>
              {/* 1. Start Here */}
              {(result.problemExplanation || result.inputOutput) && (
                <section id="overview" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    1. Start Here
                  </h3>
                  {result.problemExplanation && (
                    <p className="learning-body-text" style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{result.problemExplanation}</p>
                  )}
                  {result.inputOutput && (
                    <div style={{ marginTop: '16px' }}>
                      <strong style={{ fontSize: '12px', display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Input & Output structure
                      </strong>
                      <p className="learning-body-text" style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{result.inputOutput}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Examples (rendered inside Start Here section if overview exists, or independently) */}
              {result.exampleExplanation && result.exampleExplanation.length > 0 && (
                <section id="examples" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    Example Walkthroughs
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {result.exampleExplanation.map((ex, idx) => (
                      <div key={idx} className="preview-card-item" style={{ padding: '16px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <strong style={{ fontSize: '13px', display: 'block', color: 'var(--primary)', marginBottom: '6px' }}>
                          Example {ex.exampleNumber} Walkthrough
                        </strong>
                        <p className="learning-body-text" style={{ fontSize: '13.5px', lineHeight: '1.5', margin: 0 }}>{ex.explanation}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 2. Think about this */}
              {result.pattern && (
                <section id="pattern" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    2. Think about this
                  </h3>
                  <div className="say-in-interview-callout" style={{ backgroundColor: 'var(--ai-soft)', borderLeft: '4px solid var(--ai-accent)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                    <span className="callout-title" style={{ color: 'var(--ai-accent)', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>Identified Strategy Pattern</span>
                    <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                      {result.pattern.name}
                    </strong>
                    <p className="learning-body-text" style={{ fontSize: '13.5px', marginTop: '6px', margin: 0, lineHeight: '1.5' }}>
                      {result.pattern.reason}
                    </p>
                    {result.pattern.clues && result.pattern.clues.length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid #ddd6fe', paddingTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--ai-accent)' }}>
                          Key clues in problem description
                        </span>
                        <ul style={{ paddingLeft: '20px', marginTop: '4px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {result.pattern.clues.map((clue, idx) => (
                            <li key={idx}>{clue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 3. Cases you may have missed */}
              {result.missingEdgeCases && result.missingEdgeCases.length > 0 && (
                <section id="missingedgecases" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    3. Cases you may have missed
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {result.missingEdgeCases.map((ec, idx) => (
                      <div key={idx} className="hint-progress-step-card" style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--warning)', backgroundColor: 'var(--bg-page)' }}>
                        <div className="hint-step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '13.5px' }}>Case {idx + 1}: {ec.case}</span>
                          {ec.testInput && (
                            <code style={{ fontSize: '11px', backgroundColor: 'var(--bg-soft)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              Input: {ec.testInput}
                            </code>
                          )}
                        </div>
                        <div className="hint-step-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <p className="learning-body-text" style={{ fontSize: '13px', margin: 0 }}>
                            <strong>Why it matters:</strong> {ec.whyItMatters}
                          </p>
                          <p className="learning-body-text" style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>
                            <strong>How it breaks current approach:</strong> {ec.howItBreaksCurrentApproach}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. Guided hints */}
              {result.hints && result.hints.length > 0 && (
                <section id="hints" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    4. Guided hints
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p className="card-subtitle-text" style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      Explore hints progressively to build intuition without spoiling solutions.
                    </p>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>
                      {Math.min(revealedLevel, totalHints)} of {totalHints} hints revealed
                    </span>
                  </div>
                  
                  <div className="hint-progression-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[...result.hints]
                      .sort((a, b) => a.level - b.level)
                      .map((h) => {
                        const level = h.level;
                        const isRevealed = level <= revealedLevel;
                        
                        let label = 'Gentle nudge';
                        if (level === 2) label = 'Stronger direction';
                        if (level === 3) label = 'Almost there';

                        return (
                          <div key={level} className="hint-progress-step-card" style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: isRevealed ? 'var(--bg-page)' : 'var(--bg-soft)' }}>
                            <div className="hint-step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '13px' }}>Hint {level}</span>
                              <StatusBadge status={isRevealed ? 'COMPLETED' : 'QUEUED'} />
                            </div>
                            
                            {isRevealed ? (
                              <div className="hint-step-body" style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{h.hint}</div>
                            ) : (
                              <div className="hint-lock-overlay" style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
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
                    <div style={{ marginTop: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSolutionRevealed(true);
                          saveState(revealedLevel, true);
                        }}
                        className="clear-text-btn"
                        style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', background: 'none', border: 'none' }}
                      >
                        I want to see the solution
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* 5. Improve your approach (Code review + approach improvement) */}
              {(result.userCodeReview || result.approachImprovement) && (
                <section id="codereview" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    5. Improve your approach
                  </h3>

                  {result.userCodeReview && (
                    <div className="code-review-redesign" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: result.approachImprovement ? '24px' : '0' }}>
                      <div className="review-correctness-strip" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }}>
                        <span style={{ fontWeight: '600' }}>Submitted logic status</span>
                        <span className={result.userCodeReview.isCorrect ? 'correct-true' : 'correct-false'} style={{ fontWeight: '700', color: result.userCodeReview.isCorrect ? 'var(--primary)' : 'var(--danger)' }}>
                          {result.userCodeReview.isCorrect ? 'Logic Correct' : 'Inefficient / Has Bugs'}
                        </span>
                      </div>

                      <div className="review-section-block">
                        <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>What you did well</span>
                        <p className="learning-body-text" style={{ fontSize: '13.5px', margin: 0 }}>{result.userCodeReview.summary}</p>
                      </div>

                      {result.userCodeReview.strengths && result.userCodeReview.strengths.length > 0 && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Key Strengths</span>
                          <ul className="review-list-bullets" style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px' }}>
                            {result.userCodeReview.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                          </ul>
                        </div>
                      )}

                      {result.userCodeReview.bugs && result.userCodeReview.bugs.length > 0 && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '6px' }}>Problems found</span>
                          <ul className="review-list-bullets warning" style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: 'var(--danger)' }}>
                            {result.userCodeReview.bugs.map((bug, idx) => <li key={idx}>{bug}</li>)}
                          </ul>
                        </div>
                      )}

                      {result.userCodeReview.missedEdgeCases && result.userCodeReview.missedEdgeCases.length > 0 && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '6px' }}>Missed edge cases</span>
                          <ul className="review-list-bullets warning" style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: 'var(--danger)' }}>
                            {result.userCodeReview.missedEdgeCases.map((ec, idx) => <li key={idx}>{ec}</li>)}
                          </ul>
                        </div>
                      )}

                      {result.userCodeReview.improvements && result.userCodeReview.improvements.length > 0 && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Improvements</span>
                          <ul className="review-list-bullets" style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px' }}>
                            {result.userCodeReview.improvements.map((imp, idx) => <li key={idx}>{imp}</li>)}
                          </ul>
                        </div>
                      )}

                      {result.userCodeReview.correctedCode && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Corrected code version</span>
                          <CodeBlock
                            code={result.userCodeReview.correctedCode}
                            language={analysis.inputSnapshot?.language}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {result.approachImprovement && (
                    <div className="code-review-redesign" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {result.approachImprovement.currentStrengths && result.approachImprovement.currentStrengths.length > 0 && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', display: 'block', marginBottom: '6px' }}>Strengths</span>
                          <ul className="review-list-bullets" style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px' }}>
                            {result.approachImprovement.currentStrengths.map((str, idx) => (
                              <li key={idx}>{str}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.approachImprovement.bottlenecks && result.approachImprovement.bottlenecks.length > 0 && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '6px' }}>Bottlenecks identified</span>
                          <ul className="review-list-bullets warning" style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: 'var(--danger)' }}>
                            {result.approachImprovement.bottlenecks.map((bn, idx) => (
                              <li key={idx}>{bn}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.approachImprovement.unnecessaryWork && result.approachImprovement.unnecessaryWork.length > 0 && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--warning)', display: 'block', marginBottom: '6px' }}>Unnecessary work</span>
                          <ul className="review-list-bullets warning" style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: 'var(--warning)' }}>
                            {result.approachImprovement.unnecessaryWork.map((uw, idx) => (
                              <li key={idx}>{uw}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.approachImprovement.nextImprovement && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Next improvement step</span>
                          <p className="learning-body-text" style={{ fontSize: '13.5px', margin: 0 }}>{result.approachImprovement.nextImprovement}</p>
                        </div>
                      )}

                      {result.approachImprovement.improvedApproach && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Recommended target approach</span>
                          <p className="learning-body-text" style={{ fontSize: '13.5px', margin: 0 }}>{result.approachImprovement.improvedApproach}</p>
                        </div>
                      )}

                      {result.approachImprovement.patternToLearn && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ai-accent)', display: 'block', marginBottom: '6px' }}>Pattern or concept to study</span>
                          <div style={{ backgroundColor: 'var(--ai-soft)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--ai-accent)', fontSize: '13px' }}>
                            {result.approachImprovement.patternToLearn}
                          </div>
                        </div>
                      )}

                      {result.approachImprovement.questionsToAsk && result.approachImprovement.questionsToAsk.length > 0 && (
                        <div className="review-section-block">
                          <span className="review-section-block-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Reflective questions to ask yourself</span>
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
                  )}
                </section>
              )}

              {/* 6. Ready for the full solution? */}
              {solutionRevealed ? (
                <>
                  <section id="locked-solution" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                      6. Full Solution Unlocked
                    </h3>

                    {/* Pseudocode */}
                    {result.pseudocode && result.pseudocode.length > 0 && (
                      <div id="pseudocode" style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Pseudocode</h4>
                        <div className="monospace-block" style={{ backgroundColor: 'var(--bg-page)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          {result.pseudocode.map((line, idx) => (
                            <div key={idx} className="pseudocode-line" style={{ display: 'flex', gap: '12px', fontSize: '12.5px', fontFamily: 'monospace', lineHeight: '1.6' }}>
                              <span className="line-num" style={{ color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{idx + 1}</span>
                              <span className="line-text" style={{ color: 'var(--text-primary)' }}>{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approaches (Progressive Naive -> Optimal) */}
                    {result.approaches && result.approaches.length > 0 && (
                      <div id="approaches" style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Approaches</h4>
                        <div className="progression-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {result.approaches.map((ap, idx) => {
                            const isOptimal = (ap.category || '').toLowerCase().includes('optimal');

                            return (
                              <div key={idx} className={`progression-card ${isOptimal ? 'optimal' : ''}`} style={{ padding: '20px', border: `1px solid ${isOptimal ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', backgroundColor: isOptimal ? 'var(--primary-soft)' : 'var(--bg-page)' }}>
                                <div className="progression-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span className="progression-label" style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: isOptimal ? 'var(--primary)' : 'var(--text-secondary)' }}>
                                    {isOptimal ? 'Optimal Strategy' : (ap.category || 'Approach')}
                                  </span>
                                  <span className="progression-name" style={{ fontSize: '15px', fontWeight: '700' }}>
                                    {ap.name}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', margin: '8px 0', color: 'var(--text-secondary)' }}>
                                  <span>Time: <code style={{ fontWeight: '600' }}>{ap.timeComplexity}</code></span>
                                  <span>Space: <code style={{ fontWeight: '600' }}>{ap.spaceComplexity}</code></span>
                                </div>

                                <p style={{ fontSize: '13.5px', marginTop: '6px', margin: 0, lineHeight: '1.4' }}>
                                  <strong>Intuition:</strong> {ap.intuition}
                                </p>

                                {ap.steps && ap.steps.length > 0 && (
                                  <div style={{ fontSize: '13px', marginTop: '12px' }}>
                                    <strong>Steps:</strong>
                                    <ol style={{ paddingLeft: '20px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {ap.steps.map((step, sIdx) => (
                                        <li key={sIdx}>{step}</li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {ap.code && (
                                  <div style={{ marginTop: '16px' }}>
                                    <CodeBlock code={ap.code} language={analysis.inputSnapshot?.language} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reference Code solutions */}
                    {result.codes && result.codes.length > 0 && (
                      <div id="code" style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Code solutions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {result.codes.map((sol, idx) => (
                            <div key={idx}>
                              <h5 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary)' }}>
                                {sol.approach}
                              </h5>
                              <CodeBlock code={sol.code} language={sol.language} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Complexity (Why explanation) */}
                    {result.complexities && result.complexities.length > 0 && (
                      <div id="complexity" style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Complexity analysis</h4>
                        <div className="complexity-panels-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          {result.complexities.map((comp, idx) => (
                            <div key={idx} className="complexity-panel" style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-page)' }}>
                              <span className="complexity-panel-title" style={{ fontSize: '13.5px', fontWeight: '700', display: 'block', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>{comp.approach}</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                <div>
                                  <span className="complexity-value" style={{ fontWeight: '600', fontSize: '13px' }}>Time: {comp.timeComplexity}</span>
                                  <p className="complexity-desc" style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-secondary)', margin: 0 }}>{comp.timeReason}</p>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                  <span className="complexity-value" style={{ fontWeight: '600', fontSize: '13px' }}>Space: {comp.spaceComplexity}</span>
                                  <p className="complexity-desc" style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-secondary)', margin: 0 }}>{comp.spaceReason}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dry Run Tracing */}
                    {result.dryRun && (
                      <div id="dryrun" style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Dry run trace</h4>
                        <div className="nested-card" style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-page)' }}>
                          <p style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                            Trace Strategy: <strong>{result.dryRun.approach}</strong> | Input: <code>{result.dryRun.input}</code>
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                            {result.dryRun.steps?.map((step, idx) => (
                              <div key={idx} className="dry-run-step-block" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
                                <span className="dry-run-num-badge" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{idx + 1}</span>
                                <span className="dry-run-text" style={{ color: 'var(--text-primary)' }}>{step}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '13px', fontWeight: '600' }}>
                            Output values computed: <code>{result.dryRun.output}</code>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Compare approaches table */}
                    {result.comparison && result.comparison.length > 0 && (
                      <div id="comparison">
                        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Compare approaches</h4>
                        <div className="comparison-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                          <table className="comparison-table-view" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Approach</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Space</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Advantages</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Disadvantages</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Suitability</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.comparison.map((row, idx) => (
                                <tr key={idx} style={{ borderBottom: idx < result.comparison.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                  <td style={{ padding: '12px', fontWeight: '600' }}>{row.approach}</td>
                                  <td style={{ padding: '12px' }}><code>{row.timeComplexity}</code></td>
                                  <td style={{ padding: '12px' }}><code>{row.spaceComplexity}</code></td>
                                  <td style={{ padding: '12px' }}>
                                    <ul className="bullet-td-list" style={{ margin: 0, paddingLeft: '16px' }}>
                                      {row.advantages?.map((adv, aIdx) => <li key={aIdx}>{adv}</li>)}
                                    </ul>
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <ul className="bullet-td-list" style={{ margin: 0, paddingLeft: '16px' }}>
                                      {row.disadvantages?.map((dis, dIdx) => <li key={dIdx}>{dis}</li>)}
                                    </ul>
                                  </td>
                                  <td style={{ padding: '12px' }}>{row.interviewSuitability}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              ) : (
                /* Compact Locked Learning Panel */
                <section id="locked-solution" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    6. Ready for the full solution?
                  </h3>
                  <div className="empty-state-container" style={{ padding: '32px', border: '1px dashed var(--border)', background: 'var(--bg-page)', margin: '0', textAlign: 'center', borderRadius: 'var(--radius-sm)' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Ready to see the full solution?</h4>
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
                <section id="interview" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    Interview explanation
                  </h3>
                  <div className="say-in-interview-callout" style={{ backgroundColor: 'var(--primary-soft)', borderLeft: '4px solid var(--primary)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                    <span className="callout-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>
                      <Award size={14} />
                      How to explain this in an interview
                    </span>
                    <div className="callout-body text-pre-wrap" style={{ fontSize: '13.5px', marginTop: '8px', lineHeight: '1.6' }}>{result.interviewExplanation}</div>
                  </div>
                </section>
              )}

              {/* Ask AlgoMentor Notebook Section */}
              <section id="mentor-qa" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
                  <Sparkles size={20} style={{ color: 'var(--ai-accent)' }} />
                  <h3 className="learning-section-title" style={{ border: 'none', padding: '0', margin: '0', fontSize: '17px', fontWeight: '800' }}>
                    Ask AlgoMentor
                  </h3>
                </div>
                
                {/* Lined Notebook Paper styled discussion log */}
                <div style={{
                  backgroundColor: '#FAF9F6',
                  border: '1px solid #EAE6DF',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}>
                  {followUps.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                      No follow-up questions asked yet. Use the presets or write below to ask.
                    </p>
                  ) : (
                    followUps.map((item, idx) => (
                      <div key={item._id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: idx < followUps.length - 1 ? '1px dashed #EAE6DF' : 'none', paddingBottom: idx < followUps.length - 1 ? '20px' : '0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ fontWeight: '700', color: '#855E42' }}>STUDENT QUESTION:</span>
                          <span style={{ color: '#A09080' }}>
                            {getModeLabel(item.mode)} • {new Date(item.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '13.5px', fontStyle: 'italic', color: 'var(--text-primary)', margin: '0 0 6px 0', paddingLeft: '8px', borderLeft: '2px solid #855E42' }}>
                          "{item.question}"
                        </p>
                        
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', alignItems: 'flex-start' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--ai-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0 }}>
                            AI
                          </div>
                          <div>
                            <span style={{ fontWeight: '700', fontSize: '12px', display: 'block', color: 'var(--ai-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Mentor Insights</span>
                            <div className="learning-body-text text-pre-wrap" style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: '1.6', margin: 0 }}>
                              {item.answer}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Suggested question chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => handleChipClick('Why is this approach optimal?', 'explain')}
                    className="preset-chip-btn"
                    style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--bg-page)', cursor: 'pointer' }}
                    type="button"
                  >
                    Why is this approach optimal?
                  </button>
                  <button
                    onClick={() => handleChipClick('Which edge case am I missing?', 'edgeCase')}
                    className="preset-chip-btn"
                    style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--bg-page)', cursor: 'pointer' }}
                    type="button"
                  >
                    Which edge case am I missing?
                  </button>
                  {revealedLevel < totalHints && (
                    <button
                      onClick={() => handleChipClick('Give me one more hint', 'hint')}
                      className="preset-chip-btn"
                      style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--bg-page)', cursor: 'pointer' }}
                      type="button"
                    >
                      Give me one more hint
                    </button>
                  )}
                  <button
                    onClick={() => handleChipClick('How can I explain this in an interview?', 'interview')}
                    className="preset-chip-btn"
                    style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--bg-page)', cursor: 'pointer' }}
                    type="button"
                  >
                    How can I explain this in an interview?
                  </button>
                  <button
                    onClick={() => handleChipClick('How can I improve my code?', 'improve')}
                    className="preset-chip-btn"
                    style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--bg-page)', cursor: 'pointer' }}
                    type="button"
                  >
                    How can I improve my code?
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handleAskMentor} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                  <FormError message={followUpError} />
                  
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['explain', 'hint', 'improve', 'edgeCase', 'interview'].map((m) => (
                      <label key={m} className="checkbox-chip-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', backgroundColor: 'var(--bg-page)' }}>
                        <input
                          type="radio"
                          name="followUpMode"
                          checked={followUpMode === m}
                          onChange={() => setFollowUpMode(m)}
                          disabled={isSubmittingFollowUp}
                        />
                        <span style={followUpMode === m ? { color: 'var(--ai-accent)', fontWeight: '700' } : {}}>
                          {getModeLabel(m)}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <textarea
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Ask the AI mentor to elaborate on a concept, provide code suggestions, or test inputs..."
                      maxLength={2000}
                      required
                      rows={3}
                      disabled={isSubmittingFollowUp}
                      style={{ padding: '12px', minHeight: '80px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%', outline: 'none' }}
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
                      style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isSubmittingFollowUp ? (
                        <>
                          <div className="spinner" style={{ width: '12px', height: '12px', borderThickness: '1.5px', margin: 0 }}></div>
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
