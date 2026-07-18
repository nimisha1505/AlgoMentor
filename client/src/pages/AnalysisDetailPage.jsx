import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAnalysisById, createAnalysisFollowUp, getAnalysisFollowUps, startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import {
  ArrowLeft, BookOpen, Clock, Award, Send, Sparkles, AlertCircle,
  Target, Lightbulb, BarChart2, GitBranch, FileCode, Layers,
  AlertTriangle, CheckCircle2, TrendingUp, Brain, Star, Bookmark,
  Zap, Code2, ChevronDown, ChevronUp, Hash, AlignLeft,
  Activity, Cpu, MessageSquare
} from 'lucide-react';

const getFriendlyErrorMessage = (errMsg) => {
  if (!errMsg) {
    return 'Something went wrong while generating this analysis.';
  }

  let codeFound = false;

  try {
    if (typeof errMsg === 'string' && errMsg.trim().startsWith('{')) {
      const parsed = JSON.parse(errMsg);
      const status = parsed.status || parsed.code || (parsed.error && (parsed.error.status || parsed.error.code));
      if ([429, 500, 502, 503, 504].includes(Number(status))) {
        codeFound = true;
      }
    }
  } catch (e) {}

  if (!codeFound) {
    const match = errMsg.match(/\b(429|500|502|503|504)\b/);
    if (match) {
      codeFound = true;
    }
  }

  if (codeFound) {
    return 'The AI service is temporarily busy. Your problem and code are still saved.';
  }

  return 'Something went wrong while generating this analysis.';
};

const inferModeLabel = (requestedSections = []) => {
  if (!requestedSections || requestedSections.length === 0) return 'Complete Solution';
  if (requestedSections.includes('hints') && !requestedSections.includes('problemExplanation')) return 'Help Me Start';
  if (requestedSections.includes('problemExplanation') && requestedSections.length <= 5) return 'Understand the Problem';
  if (requestedSections.includes('comparison') && !requestedSections.includes('userCodeReview')) return 'Build the Solution';
  if (requestedSections.includes('userCodeReview') && !requestedSections.includes('hints')) return 'Review My Code';
  return 'Complete Solution';
};

const inferModeDescription = (modeLabel) => {
  const descs = {
    'Help Me Start': 'Get unstuck and understand the core idea',
    'Understand the Problem': 'Break down the problem clearly',
    'Build the Solution': 'Walk through multiple approaches',
    'Review My Code': 'Analyse and improve your solution',
    'Complete Solution': 'Full end-to-end explanation',
    'Pattern + Hints': 'Guided pattern recognition',
    'Quick Analysis': 'High-level explanation with key insights',
  };
  return descs[modeLabel] || null;
};

const inferDepthLabel = (requestedSections = []) => {
  if (!requestedSections || requestedSections.length === 0) return 'Complete';
  if (requestedSections.length <= 3) return 'Quick Analysis';
  if (requestedSections.length <= 6) return 'Focused';
  return 'Deep Dive';
};

const inferDepthDescription = (depth) => {
  const descs = {
    'Quick Analysis': 'High-level explanation with key insights',
    'Focused': 'Targeted sections based on your request',
    'Deep Dive': 'Comprehensive multi-section walkthrough',
    'Complete': 'Full analysis covering all sections',
  };
  return descs[depth] || null;
};

// Small pale-green icon tile for section headings
const SectionIcon = ({ icon: Icon, color = 'var(--primary)', bg = 'var(--primary-soft)' }) => (
  <div style={{
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }}>
    <Icon size={16} style={{ color }} />
  </div>
);

// Open document-style section wrapper
const LessonSection = ({ id, icon, iconColor, iconBg, title, children, divider = true }) => (
  <section id={id} className="adp-lesson-section">
    <div className="adp-section-head">
      <SectionIcon icon={icon} color={iconColor} bg={iconBg} />
      <h2 className="adp-section-title">{title}</h2>
    </div>
    <div className="adp-section-body">
      {children}
    </div>
    {divider && <div className="adp-section-divider" />}
  </section>
);

const AnalysisDetailPage = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  const storageKey = `algomentor-analysis-reveal-${analysisId}`;

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

  const [followUps, setFollowUps] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [followUpMode, setFollowUpMode] = useState('explain');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState('');

  useEffect(() => {
    let pollingInterval = null;

    const fetchAnalysisAndFollowUps = async () => {
      if (!analysis) {
        setIsLoading(true);
      }
      setError('');
      try {
        const data = await getAnalysisById(analysisId);
        setAnalysis(data);

        if (data && data.status === 'completed') {
          const history = await getAnalysisFollowUps(analysisId);
          setFollowUps(history || []);
          if (pollingInterval) clearInterval(pollingInterval);
        } else if (data && data.status === 'failed') {
          if (pollingInterval) clearInterval(pollingInterval);
        }
      } catch (err) {
        setError(getApiErrorMessage(err));
        if (pollingInterval) clearInterval(pollingInterval);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysisAndFollowUps();

    if (!analysis || (analysis.status === 'queued' || analysis.status === 'processing')) {
      pollingInterval = setInterval(() => {
        fetchAnalysisAndFollowUps();
      }, 3000);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [analysisId, analysis?.status]);

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

  const handleRetryAnalysis = async () => {
    if (!analysis?.problem) return;
    setIsRetrying(true);
    setRetryError('');
    try {
      const newAnalysis = await startProblemAnalysis(analysis.problem);
      navigate(`/analyses/${newAnalysis._id}`);
    } catch (err) {
      setRetryError(getApiErrorMessage(err));
    } finally {
      setIsRetrying(false);
    }
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

  const getComplexityRows = () => {
    if (result.complexities && result.complexities.length > 0) {
      return result.complexities.map(comp => ({
        approach: comp.approach,
        timeComplexity: comp.timeComplexity,
        timeReason: comp.timeReason || 'Standard implementation analysis',
        spaceComplexity: comp.spaceComplexity,
        spaceReason: comp.spaceReason || 'Auxiliary space allocation details',
      }));
    }
    if (result.approaches && result.approaches.length > 0) {
      return result.approaches.map(ap => ({
        approach: ap.name,
        timeComplexity: ap.timeComplexity,
        timeReason: ap.intuition || 'Asymptotic bound based on algorithm steps',
        spaceComplexity: ap.spaceComplexity,
        spaceReason: 'In-place processing space requirements',
      }));
    }
    return [];
  };

  const complexityRows = getComplexityRows();

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

  // Rail data derived from real analysis data
  const modeLabel = inferModeLabel(analysis.requestedSections);
  const modeDesc = inferModeDescription(modeLabel);
  const depthLabel = inferDepthLabel(analysis.requestedSections);
  const depthDesc = inferDepthDescription(depthLabel);
  const patternName = result.pattern?.name;
  const patternReason = result.pattern?.reason;
  const confidence = result.confidence || result.pattern?.confidence || null;
  const revisionStatus = analysis.revisionStatus || null;
  const savedStatus = analysis.saved || analysis.isSaved || null;
  const nextAction = result.nextRecommendedAction || null;

  // Confidence levels
  const confidenceLevels = ['very-low', 'low', 'medium', 'high', 'very-high'];
  const confidenceLabels = { 'very-low': 'Very Low', low: 'Low', medium: 'Medium', high: 'High', 'very-high': 'Very High' };
  const confidenceColors = { 'very-low': 'var(--danger)', low: 'var(--warning)', medium: '#B7791F', high: 'var(--primary)', 'very-high': 'var(--primary)' };

  const getConfidenceLevel = (conf) => {
    if (!conf) return null;
    const lower = String(conf).toLowerCase().trim();
    if (lower === 'high' || lower === 'very high' || lower === 'very-high') return 'high';
    if (lower === 'medium') return 'medium';
    if (lower === 'low') return 'low';
    if (lower === 'very low' || lower === 'very-low') return 'very-low';
    return null;
  };

  const confidenceKey = getConfidenceLevel(confidence);

  const getApproachAccent = (category) => {
    const lower = (category || '').toLowerCase();
    if (lower.includes('optimal')) return { border: 'var(--primary)', bg: 'var(--primary-soft)', label: 'var(--primary)', tag: 'Optimal' };
    if (lower.includes('better') || lower.includes('improved')) return { border: '#6D5CE7', bg: '#F0EEFF', label: '#6D5CE7', tag: 'Better' };
    return { border: 'var(--border)', bg: '#FAFAFA', label: 'var(--text-secondary)', tag: category || 'Brute Force' };
  };

  return (
    <div className="adp-page container" style={{ paddingBottom: '80px' }}>
      {/* ── Top action bar ── */}
      <div className="adp-topbar">
        <div className="adp-topbar-left">
          <Link to="/problems" className="adp-back-link">
            <ArrowLeft size={14} /> My Problems
          </Link>
          {analysis.problem && (
            <Link
              to={typeof analysis.problem === 'object' ? `/problems/${analysis.problem._id}` : `/problems/${analysis.problem}`}
              className="adp-back-link"
            >
              <BookOpen size={14} /> View Details
            </Link>
          )}
        </div>
        <div className="adp-topbar-right">
          <Link to="/problems/new" className="btn btn-secondary adp-action-btn">
            Analyse Again
          </Link>
          <Link to="/problems" className="btn btn-secondary adp-action-btn">
            History
          </Link>
        </div>
      </div>

      {/* ── Header banner ── */}
      <header className="adp-header">
        <div className="adp-header-top">
          <div className="adp-header-title-block">
            <span className="adp-eyebrow">
              <Sparkles size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              PERSONALISED DSA LESSON
            </span>
            <h1 className="adp-problem-title">
              {analysis.inputSnapshot?.title || 'Untitled DSA Problem'}
            </h1>
          </div>
          {(() => {
            const norm = (analysis.status || '').toLowerCase();
            let label = 'Unknown';
            let bg = 'var(--bg-soft)';
            let color = 'var(--text-secondary)';
            let dot = null;
            if (norm === 'completed') {
              label = 'Completed';
              bg = 'var(--primary-soft)';
              color = 'var(--primary)';
              dot = <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />;
            } else if (norm === 'queued' || norm === 'processing') {
              label = norm === 'queued' ? 'Queued' : 'Processing';
              bg = 'var(--warning-soft)';
              color = 'var(--warning)';
            } else if (norm === 'failed') {
              label = 'Failed';
              bg = 'var(--danger-soft)';
              color = 'var(--danger)';
            }
            return (
              <span className="adp-status-badge" style={{ backgroundColor: bg, color, border: `1px solid ${color}33` }}>
                {dot}{label}
              </span>
            );
          })()}
        </div>

        <div className="adp-meta-strip">
          {analysis.inputSnapshot?.language && (
            <span className="adp-meta-item">
              <Code2 size={13} style={{ color: 'var(--text-muted)' }} />
              {getLanguageLabel(analysis.inputSnapshot.language)}
            </span>
          )}
          {(analysis.requestedSections && analysis.requestedSections.length > 0) && (
            <span className="adp-meta-item">
              <Target size={13} style={{ color: 'var(--text-muted)' }} />
              {modeLabel}
            </span>
          )}
          {result.pattern?.name && (
            <span className="adp-meta-item">
              <GitBranch size={13} style={{ color: 'var(--text-muted)' }} />
              {result.pattern.name}
            </span>
          )}
          <span className="adp-meta-item">
            <Clock size={13} style={{ color: 'var(--text-muted)' }} />
            {new Date(analysis.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            {new Date(analysis.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      {/* ── Failed state ── */}
      {status === 'failed' ? (
        <div className="analysis-failed-state-wrapper" style={{ marginTop: '24px', width: '100%' }}>
          <div
            className="analysis-failed-state-card"
            style={{
              padding: '24px 32px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger-soft)',
                color: 'var(--danger)',
              }}
            >
              <AlertCircle size={24} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  margin: 0
                }}
              >
                Analysis could not be completed
              </h2>

              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  maxWidth: '600px',
                  margin: '0 auto',
                  lineHeight: '1.6'
                }}
              >
                {getFriendlyErrorMessage(analysis.errorMessage)}
              </p>
            </div>

            {retryError && (
              <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                <FormError message={retryError} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRetryAnalysis}
                disabled={isRetrying}
                className="btn btn-primary"
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '120px',
                  justifyContent: 'center'
                }}
              >
                {isRetrying ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px', margin: 0 }}></div>
                    <span>Retrying...</span>
                  </>
                ) : (
                  'Try Again'
                )}
              </button>

              <Link
                to="/problems"
                className="btn btn-secondary"
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Back to My Problems
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ── Main workspace (queued / processing / completed) ── */
        <div className="adp-workspace">

          {/* ── Processing / queued spinner ── */}
          {(status === 'queued' || status === 'processing') && (
            <div
              className="analysis-status-card"
              style={{
                padding: '48px 32px',
                textAlign: 'center',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <div
                className="spinner"
                style={{
                  width: '32px',
                  height: '32px',
                  borderWidth: '3px',
                  margin: 0
                }}
              ></div>
              <h3
                className="status-card-title"
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}
              >
                Building your personalised lesson…
              </h3>
            </div>
          )}

          {/* ── Completed two-column layout ── */}
          {status === 'completed' && (
            <div className="adp-completed-layout">

              {/* ──── Main lesson column (70%) ──── */}
              <main className="adp-lesson-col">

                {/* 1. Problem Understanding */}
                {result.problemExplanation && (
                  <LessonSection
                    id="problemExplanation"
                    icon={Target}
                    iconColor="var(--primary)"
                    iconBg="var(--primary-soft)"
                    title="Problem Understanding"
                  >
                    <p className="adp-body-text">{result.problemExplanation}</p>
                  </LessonSection>
                )}

                {/* 2. Input and Output */}
                {result.inputOutput && (
                  <LessonSection
                    id="inputOutput"
                    icon={AlignLeft}
                    iconColor="#157A75"
                    iconBg="var(--color-teal-soft)"
                    title="Input and Output"
                  >
                    {typeof result.inputOutput === 'object' && (result.inputOutput.input || result.inputOutput.output) ? (
                      <div className="adp-io-grid">
                        {result.inputOutput.input && (
                          <div className="adp-io-box">
                            <span className="adp-io-label adp-io-label-in">Input</span>
                            <p className="adp-body-text" style={{ marginTop: '6px' }}>{result.inputOutput.input}</p>
                          </div>
                        )}
                        {result.inputOutput.output && (
                          <div className="adp-io-box">
                            <span className="adp-io-label adp-io-label-out">Output</span>
                            <p className="adp-body-text" style={{ marginTop: '6px' }}>{result.inputOutput.output}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="adp-body-text">{String(result.inputOutput)}</p>
                    )}
                  </LessonSection>
                )}

                {/* 3. Constraints */}
                {result.constraints && result.constraints.length > 0 && (
                  <LessonSection
                    id="constraints"
                    icon={Hash}
                    iconColor="#157A75"
                    iconBg="var(--color-teal-soft)"
                    title="Constraints"
                  >
                    <ul className="adp-bullet-list">
                      {result.constraints.map((c, idx) => (
                        <li key={idx}>
                          <code className="adp-inline-code">{c.constraint || c}</code>
                          {c.implication && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}> — {c.implication}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </LessonSection>
                )}

                {/* 4. Examples */}
                {result.exampleExplanation && result.exampleExplanation.length > 0 && (
                  <LessonSection
                    id="examples"
                    icon={FileCode}
                    iconColor="#6D5CE7"
                    iconBg="#F0EEFF"
                    title="Examples"
                  >
                    <div className="adp-examples-grid">
                      {result.exampleExplanation.map((ex, idx) => (
                        <div key={idx} className="adp-example-card">
                          {ex.input !== undefined && (
                            <div className="adp-example-row">
                              <span className="adp-example-field">Input</span>
                              <span className="adp-example-value">{String(ex.input)}</span>
                            </div>
                          )}
                          {ex.output !== undefined && (
                            <div className="adp-example-row">
                              <span className="adp-example-field">Output</span>
                              <span className="adp-example-value">{String(ex.output)}</span>
                            </div>
                          )}
                          {ex.explanation && (
                            <div className="adp-example-row">
                              <span className="adp-example-field">Explanation</span>
                              <span className="adp-example-value" style={{ color: 'var(--text-secondary)' }}>{ex.explanation}</span>
                            </div>
                          )}
                          {!ex.input && !ex.output && ex.explanation && (
                            <p className="adp-body-text" style={{ margin: 0 }}>{ex.explanation}</p>
                          )}
                          {ex.exampleNumber && !ex.input && !ex.output && !ex.explanation && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Example {ex.exampleNumber}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </LessonSection>
                )}

                {/* 5. Edge Cases */}
                {result.edgeCases && result.edgeCases.length > 0 && (
                  <LessonSection
                    id="edgeCases"
                    icon={AlertTriangle}
                    iconColor="var(--warning)"
                    iconBg="var(--warning-soft)"
                    title="Edge Cases"
                  >
                    <ul className="adp-bullet-list">
                      {result.edgeCases.map((ec, idx) => (
                        <li key={idx}>
                          <strong>{ec.case || ec}</strong>
                          {ec.reason && <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}> — {ec.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </LessonSection>
                )}

                {/* 6. Missing Edge Cases */}
                {result.missingEdgeCases && result.missingEdgeCases.length > 0 && (
                  <LessonSection
                    id="missingedgecases"
                    icon={AlertTriangle}
                    iconColor="var(--danger)"
                    iconBg="var(--danger-soft)"
                    title="Missed Edge Cases"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {result.missingEdgeCases.map((ec, idx) => (
                        <div key={idx} className="adp-missing-ec-row">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '14px' }}>Case {idx + 1}: {ec.case}</strong>
                            {ec.testInput && (
                              <code className="adp-inline-code" style={{ fontSize: '11px' }}>Input: {ec.testInput}</code>
                            )}
                          </div>
                          {ec.whyItMatters && (
                            <p className="adp-body-text" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                              <strong>Why it matters:</strong> {ec.whyItMatters}
                            </p>
                          )}
                          {ec.howItBreaksCurrentApproach && (
                            <p className="adp-body-text" style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--danger)' }}>
                              <strong>How it breaks:</strong> {ec.howItBreaksCurrentApproach}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </LessonSection>
                )}

                {/* 7. Pattern */}
                {result.pattern && (
                  <LessonSection
                    id="pattern"
                    icon={GitBranch}
                    iconColor="#6D5CE7"
                    iconBg="#F0EEFF"
                    title="Pattern"
                  >
                    {result.pattern.name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span className="adp-pattern-chip">{result.pattern.name}</span>
                      </div>
                    )}
                    {result.pattern.reason && (
                      <p className="adp-body-text" style={{ marginBottom: '16px' }}>{result.pattern.reason}</p>
                    )}
                    {(result.pattern.clues?.length > 0 || result.pattern.whyItFits) && (
                      <div className="adp-pattern-grid">
                        {result.pattern.clues?.length > 0 && (
                          <div className="adp-pattern-col">
                            <span className="adp-pattern-col-label" style={{ color: 'var(--primary)' }}>Clues</span>
                            <ul className="adp-bullet-list" style={{ marginTop: '6px' }}>
                              {result.pattern.clues.map((clue, idx) => (
                                <li key={idx}>{clue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.pattern.whyItFits && (
                          <div className="adp-pattern-col">
                            <span className="adp-pattern-col-label" style={{ color: '#6D5CE7' }}>Why It Fits</span>
                            <p className="adp-body-text" style={{ marginTop: '6px' }}>{result.pattern.whyItFits}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </LessonSection>
                )}

                {/* 8. Hints */}
                {result.hints && result.hints.length > 0 && (
                  <LessonSection
                    id="hints"
                    icon={Lightbulb}
                    iconColor="var(--warning)"
                    iconBg="var(--warning-soft)"
                    title="Hints"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Reveal progressively to build intuition.
                      </p>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--warning)' }}>
                        {Math.min(revealedLevel, totalHints)} / {totalHints} revealed
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[...result.hints]
                        .sort((a, b) => a.level - b.level)
                        .map((h) => {
                          const level = h.level;
                          const isRevealed = level <= revealedLevel;
                          let label = 'Gentle nudge';
                          if (level === 2) label = 'Stronger direction';
                          if (level === 3) label = 'Almost there';
                          return (
                            <div key={level} className="adp-hint-row" style={{ borderLeftColor: isRevealed ? 'var(--warning)' : 'var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Hint {level}
                                </span>
                                {!isRevealed && (
                                  <button
                                    type="button"
                                    onClick={() => { setRevealedLevel(level); saveState(level, solutionRevealed); }}
                                    className="adp-reveal-btn"
                                  >
                                    Reveal {label}
                                  </button>
                                )}
                              </div>
                              {isRevealed ? (
                                <p className="adp-body-text" style={{ margin: '6px 0 0 0' }}>{h.hint}</p>
                              ) : (
                                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Hidden — reveal when ready.
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </LessonSection>
                )}

                {/* 9. Approaches */}
                {result.approaches && result.approaches.length > 0 && (
                  <LessonSection
                    id="approaches"
                    icon={Layers}
                    iconColor="var(--primary)"
                    iconBg="var(--primary-soft)"
                    title="Approaches"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {result.approaches.map((ap, idx) => {
                        const acc = getApproachAccent(ap.category);
                        return (
                          <div key={idx} className="adp-approach-card" style={{ borderColor: acc.border, backgroundColor: acc.bg }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="adp-approach-tag" style={{ backgroundColor: `${acc.border}18`, color: acc.label }}>{acc.tag}</span>
                                <strong style={{ fontSize: '15px' }}>{ap.name}</strong>
                              </div>
                              {(ap.timeComplexity || ap.spaceComplexity) && (
                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {ap.timeComplexity && <span>Time: <code style={{ fontWeight: '700', color: acc.label }}>{ap.timeComplexity}</code></span>}
                                  {ap.spaceComplexity && <span>Space: <code style={{ fontWeight: '700', color: acc.label }}>{ap.spaceComplexity}</code></span>}
                                </div>
                              )}
                            </div>
                            {ap.intuition && (
                              <p className="adp-body-text" style={{ marginBottom: ap.steps ? '10px' : 0 }}>
                                <strong>Intuition:</strong> {ap.intuition}
                              </p>
                            )}
                            {ap.explanation && !ap.intuition && (
                              <p className="adp-body-text" style={{ marginBottom: ap.steps ? '10px' : 0 }}>{ap.explanation}</p>
                            )}
                            {ap.steps && ap.steps.length > 0 && (
                              <div style={{ marginTop: '10px' }}>
                                <strong style={{ fontSize: '13px' }}>Steps:</strong>
                                <ol className="adp-ordered-list" style={{ marginTop: '6px' }}>
                                  {ap.steps.map((step, sIdx) => (
                                    <li key={sIdx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {ap.tradeoffs && (
                              <p className="adp-body-text" style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <strong>Trade-offs:</strong> {ap.tradeoffs}
                              </p>
                            )}
                            {ap.code && (
                              <div style={{ marginTop: '14px' }}>
                                <CodeBlock code={ap.code} language={analysis.inputSnapshot?.language} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </LessonSection>
                )}

                {/* 10. Pseudocode */}
                {result.pseudocode && result.pseudocode.length > 0 && (
                  <LessonSection
                    id="pseudocode"
                    icon={Code2}
                    iconColor="var(--primary)"
                    iconBg="var(--primary-soft)"
                    title="Pseudocode"
                  >
                    <div className="adp-pseudocode-block">
                      {result.pseudocode.map((line, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '16px', lineHeight: '1.7' }}>
                          <span style={{ color: 'var(--text-muted)', width: '22px', textAlign: 'right', flexShrink: 0, userSelect: 'none' }}>{idx + 1}</span>
                          <span style={{ color: 'var(--text-primary)' }}>{line}</span>
                        </div>
                      ))}
                    </div>
                  </LessonSection>
                )}

                {/* 11. Code Solutions */}
                {result.codes && result.codes.length > 0 && (
                  <LessonSection
                    id="code"
                    icon={FileCode}
                    iconColor="var(--primary)"
                    iconBg="var(--primary-soft)"
                    title="Solutions"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {result.codes.map((sol, idx) => (
                        <div key={idx}>
                          {sol.approach && (
                            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>
                              {sol.approach}
                            </h4>
                          )}
                          <CodeBlock code={sol.code} language={sol.language} />
                        </div>
                      ))}
                    </div>
                  </LessonSection>
                )}

                {/* 12. Complexity */}
                {complexityRows.length > 0 && (
                  <LessonSection
                    id="complexity"
                    icon={BarChart2}
                    iconColor="var(--primary)"
                    iconBg="var(--primary-soft)"
                    title="Complexity"
                  >
                    <div className="adp-table-wrap">
                      <table className="adp-table">
                        <thead>
                          <tr>
                            <th>Approach</th>
                            <th>Time</th>
                            <th>Space</th>
                            <th>Why</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complexityRows.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: '600' }}>{row.approach}</td>
                              <td><code className="adp-inline-code" style={{ color: 'var(--primary)' }}>{row.timeComplexity}</code></td>
                              <td><code className="adp-inline-code" style={{ color: '#6D5CE7' }}>{row.spaceComplexity}</code></td>
                              <td style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                <strong>Time:</strong> {row.timeReason}<br />
                                <strong>Space:</strong> {row.spaceReason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </LessonSection>
                )}

                {/* 13. Dry Run */}
                {result.dryRun && (
                  <LessonSection
                    id="dryrun"
                    icon={Activity}
                    iconColor="#157A75"
                    iconBg="var(--color-teal-soft)"
                    title="Dry Run"
                  >
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Strategy: <strong>{result.dryRun.approach}</strong> &nbsp;·&nbsp; Input: <code className="adp-inline-code">{result.dryRun.input}</code>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                      {result.dryRun.steps?.map((step, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px' }}>
                          <span style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{idx + 1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', fontSize: '13px', fontWeight: '600' }}>
                      Output: <code className="adp-inline-code">{result.dryRun.output}</code>
                    </div>
                  </LessonSection>
                )}

                {/* 14. Comparison */}
                {result.comparison && result.comparison.length > 0 && (
                  <LessonSection
                    id="comparison"
                    icon={TrendingUp}
                    iconColor="var(--primary)"
                    iconBg="var(--primary-soft)"
                    title="Comparison"
                  >
                    <div className="adp-table-wrap">
                      <table className="adp-table">
                        <thead>
                          <tr>
                            <th>Approach</th>
                            <th>Main Idea</th>
                            <th>Time</th>
                            <th>Space</th>
                            <th>Advantages</th>
                            <th>Limitations</th>
                            <th>Best Used When</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.comparison.map((row, idx) => {
                            const isOptimal = row.approach?.toLowerCase().includes('optimal') || row.interviewSuitability?.toLowerCase().includes('recommended') || row.recommendedUse?.toLowerCase().includes('recommended');
                            return (
                              <tr key={idx} style={{ backgroundColor: isOptimal ? 'var(--primary-soft)' : 'transparent' }}>
                                <td style={{ fontWeight: '700', color: isOptimal ? 'var(--primary)' : 'var(--text-primary)' }}>{row.approach}</td>
                                <td>{row.mainIdea || row.approach}</td>
                                <td><code className="adp-inline-code">{row.timeComplexity}</code></td>
                                <td><code className="adp-inline-code">{row.spaceComplexity}</code></td>
                                <td>
                                  <ul style={{ margin: 0, paddingLeft: '14px' }}>
                                    {row.advantages?.map((adv, aIdx) => <li key={aIdx}>{adv}</li>)}
                                  </ul>
                                </td>
                                <td>
                                  <ul style={{ margin: 0, paddingLeft: '14px' }}>
                                    {(row.limitations || row.disadvantages)?.map((lim, lIdx) => <li key={lIdx}>{lim}</li>)}
                                  </ul>
                                </td>
                                <td>{row.recommendedUse || row.interviewSuitability}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </LessonSection>
                )}

                {/* 15. Interview Explanation */}
                {result.interviewExplanation && (
                  <LessonSection
                    id="interviewExplanation"
                    icon={Award}
                    iconColor="var(--primary)"
                    iconBg="var(--primary-soft)"
                    title="Interview Explanation"
                  >
                    <div className="adp-interview-callout">
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={12} /> How to explain in an interview
                      </span>
                      <div className="adp-body-text" style={{ marginTop: '8px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{result.interviewExplanation}</div>
                    </div>
                  </LessonSection>
                )}

                {/* 16. Code Review / Approach Improvement */}
                {(result.userCodeReview || result.approachImprovement) && (
                  <LessonSection
                    id="approachImprovement"
                    icon={Brain}
                    iconColor="#6D5CE7"
                    iconBg="#F0EEFF"
                    title="Code Review"
                  >
                    {result.userCodeReview && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: result.approachImprovement ? '24px' : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }}>
                          <span style={{ fontWeight: '600' }}>Submitted logic status</span>
                          <span style={{ fontWeight: '700', color: result.userCodeReview.isCorrect ? 'var(--primary)' : 'var(--danger)' }}>
                            {result.userCodeReview.isCorrect ? 'Logic Correct' : 'Inefficient / Has Bugs'}
                          </span>
                        </div>
                        {result.userCodeReview.summary && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>What you did well</span>
                            <p className="adp-body-text">{result.userCodeReview.summary}</p>
                          </div>
                        )}
                        {result.userCodeReview.strengths?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Key Strengths</span>
                            <ul className="adp-bullet-list">
                              {result.userCodeReview.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                            </ul>
                          </div>
                        )}
                        {result.userCodeReview.bugs?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '5px' }}>Problems found</span>
                            <ul className="adp-bullet-list" style={{ color: 'var(--danger)' }}>
                              {result.userCodeReview.bugs.map((bug, idx) => <li key={idx}>{bug}</li>)}
                            </ul>
                          </div>
                        )}
                        {result.userCodeReview.missedEdgeCases?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '5px' }}>Missed edge cases</span>
                            <ul className="adp-bullet-list" style={{ color: 'var(--danger)' }}>
                              {result.userCodeReview.missedEdgeCases.map((ec, idx) => <li key={idx}>{ec}</li>)}
                            </ul>
                          </div>
                        )}
                        {result.userCodeReview.improvements?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Improvements</span>
                            <ul className="adp-bullet-list">
                              {result.userCodeReview.improvements.map((imp, idx) => <li key={idx}>{imp}</li>)}
                            </ul>
                          </div>
                        )}
                        {result.userCodeReview.correctedCode && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Corrected code</span>
                            <CodeBlock code={result.userCodeReview.correctedCode} language={analysis.inputSnapshot?.language} />
                          </div>
                        )}
                      </div>
                    )}

                    {result.approachImprovement && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {result.approachImprovement.currentStrengths?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', display: 'block', marginBottom: '5px' }}>Strengths</span>
                            <ul className="adp-bullet-list">
                              {result.approachImprovement.currentStrengths.map((str, idx) => <li key={idx}>{str}</li>)}
                            </ul>
                          </div>
                        )}
                        {result.approachImprovement.bottlenecks?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '5px' }}>Bottlenecks</span>
                            <ul className="adp-bullet-list" style={{ color: 'var(--danger)' }}>
                              {result.approachImprovement.bottlenecks.map((bn, idx) => <li key={idx}>{bn}</li>)}
                            </ul>
                          </div>
                        )}
                        {result.approachImprovement.unnecessaryWork?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--warning)', display: 'block', marginBottom: '5px' }}>Unnecessary work</span>
                            <ul className="adp-bullet-list" style={{ color: 'var(--warning)' }}>
                              {result.approachImprovement.unnecessaryWork.map((uw, idx) => <li key={idx}>{uw}</li>)}
                            </ul>
                          </div>
                        )}
                        {result.approachImprovement.nextImprovement && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Next improvement step</span>
                            <p className="adp-body-text">{result.approachImprovement.nextImprovement}</p>
                          </div>
                        )}
                        {result.approachImprovement.improvedApproach && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Recommended approach</span>
                            <p className="adp-body-text">{result.approachImprovement.improvedApproach}</p>
                          </div>
                        )}
                        {result.approachImprovement.patternToLearn && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6D5CE7', display: 'block', marginBottom: '5px' }}>Pattern to study</span>
                            <div style={{ backgroundColor: '#F0EEFF', padding: '12px 14px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #6D5CE7', fontSize: '13px' }}>
                              {result.approachImprovement.patternToLearn}
                            </div>
                          </div>
                        )}
                        {result.approachImprovement.questionsToAsk?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Reflective questions</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  </LessonSection>
                )}

                {/* Ask AlgoMentor */}
                <section id="mentor-qa" className="adp-lesson-section" style={{ paddingBottom: 0 }}>
                  <div className="adp-section-head">
                    <SectionIcon icon={Sparkles} color="#6D5CE7" bg="#F0EEFF" />
                    <h2 className="adp-section-title">Ask AlgoMentor</h2>
                  </div>
                  <div className="adp-section-body">
                    <div className="adp-mentor-log">
                      {followUps.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                          No follow-up questions yet. Use the presets or write below to ask.
                        </p>
                      ) : (
                        followUps.map((item, idx) => (
                          <div key={item._id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: idx < followUps.length - 1 ? '1px dashed var(--border)' : 'none', paddingBottom: idx < followUps.length - 1 ? '20px' : '0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                              <span style={{ fontWeight: '700', color: '#855E42' }}>STUDENT QUESTION:</span>
                              <span style={{ color: '#A09080' }}>
                                {getModeLabel(item.mode)} · {new Date(item.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p style={{ fontSize: '13.5px', fontStyle: 'italic', color: 'var(--text-primary)', margin: '0 0 6px 0', paddingLeft: '8px', borderLeft: '2px solid #855E42' }}>
                              "{item.question}"
                            </p>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', alignItems: 'flex-start' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#6D5CE7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0 }}>
                                AI
                              </div>
                              <div>
                                <span style={{ fontWeight: '700', fontSize: '12px', display: 'block', color: '#6D5CE7', textTransform: 'uppercase', marginBottom: '4px' }}>Mentor Insights</span>
                                <div className="adp-body-text" style={{ whiteSpace: 'pre-wrap' }}>{item.answer}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chip suggestions */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                      <button onClick={() => handleChipClick('Why is this approach optimal?', 'explain')} className="adp-chip-btn" type="button">Why is this approach optimal?</button>
                      <button onClick={() => handleChipClick('Which edge case am I missing?', 'edgeCase')} className="adp-chip-btn" type="button">Which edge case am I missing?</button>
                      {revealedLevel < totalHints && (
                        <button onClick={() => handleChipClick('Give me one more hint', 'hint')} className="adp-chip-btn" type="button">Give me one more hint</button>
                      )}
                      <button onClick={() => handleChipClick('How can I explain this in an interview?', 'interview')} className="adp-chip-btn" type="button">How can I explain this in an interview?</button>
                      <button onClick={() => handleChipClick('How can I improve my code?', 'improve')} className="adp-chip-btn" type="button">How can I improve my code?</button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAskMentor} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                      <FormError message={followUpError} />
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['explain', 'hint', 'improve', 'edgeCase', 'interview'].map((m) => (
                          <label key={m} className="adp-mode-chip" style={{ backgroundColor: followUpMode === m ? 'var(--primary-soft)' : 'var(--bg-page)', borderColor: followUpMode === m ? 'var(--primary)' : 'var(--border)', color: followUpMode === m ? 'var(--primary)' : 'inherit' }}>
                            <input type="radio" name="followUpMode" checked={followUpMode === m} onChange={() => setFollowUpMode(m)} disabled={isSubmittingFollowUp} style={{ display: 'none' }} />
                            {getModeLabel(m)}
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
                          style={{ padding: '12px', minHeight: '80px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%', outline: 'none', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{newQuestion.length}/2000 characters</span>
                        <button
                          type="submit"
                          disabled={isSubmittingFollowUp || !newQuestion.trim()}
                          className="btn btn-primary btn-sm icon-btn"
                          style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          {isSubmittingFollowUp ? (
                            <>
                              <div className="spinner" style={{ width: '12px', height: '12px', margin: 0 }}></div>
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
                  </div>
                </section>
              </main>

              {/* ──── Right learning summary rail (30%) ──── */}
              <aside className="adp-rail">
                <div className="adp-rail-inner">
                  <h3 className="adp-rail-title">Your Learning Summary</h3>

                  {/* Learning Mode */}
                  {modeLabel && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Brain size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Learning Mode</span>
                        <strong className="adp-rail-value">{modeLabel}</strong>
                        {modeDesc && <span className="adp-rail-sub">{modeDesc}</span>}
                      </div>
                    </div>
                  )}

                  {/* Detected Pattern */}
                  {patternName && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <GitBranch size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Detected Pattern</span>
                        <strong className="adp-rail-value" style={{ color: 'var(--primary)' }}>{patternName}</strong>
                        {patternReason && <span className="adp-rail-sub">{patternReason}</span>}
                      </div>
                    </div>
                  )}

                  {/* Analysis Depth */}
                  {depthLabel && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Layers size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Analysis Depth</span>
                        <strong className="adp-rail-value">{depthLabel}</strong>
                        {depthDesc && <span className="adp-rail-sub">{depthDesc}</span>}
                      </div>
                    </div>
                  )}

                  {/* Confidence — only when real data exists */}
                  {confidenceKey && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Star size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Confidence</span>
                        <strong className="adp-rail-value" style={{ color: confidenceColors[confidenceKey] }}>
                          {confidenceLabels[confidenceKey]}
                        </strong>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
                          {['very-low', 'low', 'medium', 'high', 'very-high'].map((lvl, i) => {
                            const filled = ['very-low', 'low', 'medium', 'high', 'very-high'].indexOf(confidenceKey) >= i;
                            return (
                              <span key={lvl} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: filled ? confidenceColors[confidenceKey] : 'var(--border)', display: 'inline-block' }} />
                            );
                          })}
                        </div>
                        {result.confidenceReason && (
                          <span className="adp-rail-sub">{result.confidenceReason}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Revision Status */}
                  {revisionStatus && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Clock size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Revision Status</span>
                        <strong className="adp-rail-value" style={{ color: revisionStatus === 'new' ? 'var(--warning)' : 'var(--primary)', textTransform: 'capitalize' }}>{revisionStatus}</strong>
                        <span className="adp-rail-sub">
                          {revisionStatus === 'new' ? 'Keep practising to reinforce this pattern' : 'Review this problem again soon'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Saved Status */}
                  {savedStatus !== null && savedStatus !== undefined && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Bookmark size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Saved Status</span>
                        <strong className="adp-rail-value" style={{ color: savedStatus ? 'var(--primary)' : 'var(--text-secondary)' }}>
                          {savedStatus ? 'Saved to your library' : 'Not saved'}
                        </strong>
                        {savedStatus && <span className="adp-rail-sub">You can review it anytime</span>}
                      </div>
                    </div>
                  )}

                  {/* Next Recommended Action */}
                  {nextAction && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Zap size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Next Recommended Action</span>
                        <strong className="adp-rail-value">{nextAction}</strong>
                      </div>
                    </div>
                  )}

                  {/* Requested Sections */}
                  {analysis.requestedSections && analysis.requestedSections.length > 0 && (
                    <div className="adp-rail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="adp-rail-icon-wrap">
                          <Hash size={14} style={{ color: 'var(--primary)' }} />
                        </div>
                        <span className="adp-rail-label" style={{ margin: 0 }}>Requested Sections</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingLeft: '32px' }}>
                        {analysis.requestedSections.map((sec, idx) => (
                          <span key={idx} className="adp-section-tag">{sec}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisDetailPage;
export { AnalysisDetailPage };
