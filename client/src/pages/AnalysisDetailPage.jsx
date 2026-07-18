import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAnalysisById, createAnalysisFollowUp, getAnalysisFollowUps, startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, BookOpen, Clock, Cpu, Activity, Award, MessageSquare, Send, Sparkles, AlertCircle } from 'lucide-react';

const getFriendlyErrorMessage = (errMsg) => {
  if (!errMsg) {
    return 'Something went wrong while generating this analysis.';
  }

  let codeFound = false;

  // Try to parse as JSON first in case it's a raw JSON error structure
  try {
    if (typeof errMsg === 'string' && errMsg.trim().startsWith('{')) {
      const parsed = JSON.parse(errMsg);
      const status = parsed.status || parsed.code || (parsed.error && (parsed.error.status || parsed.error.code));
      if ([429, 500, 502, 503, 504].includes(Number(status))) {
        codeFound = true;
      }
    }
  } catch (e) {
    // Ignore and fallback to regex search
  }

  // If not found in JSON, search the raw text for status code numbers as standalone words
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

const AnalysisDetailPage = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

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
    let pollingInterval = null;

    const fetchAnalysisAndFollowUps = async () => {
      // Only set initial loading if we don't have analysis data yet
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

    // Start polling if analysis is not complete or failed yet
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

  // Sidenav items filtered dynamically based on available sections
  const getSidenavItems = () => {
    const items = [];
    if (result.problemExplanation) {
      items.push({ id: 'problemExplanation', label: '1. Simple Words' });
    }
    if (result.inputOutput) {
      items.push({ id: 'inputOutput', label: '2. Input & Output' });
    }
    if (result.exampleExplanation && result.exampleExplanation.length > 0) {
      items.push({ id: 'examples', label: '3. Examples' });
    }
    if (result.constraints && result.constraints.length > 0) {
      items.push({ id: 'constraints', label: '4. Constraints' });
    }
    if (result.edgeCases && result.edgeCases.length > 0) {
      items.push({ id: 'edgeCases', label: '5. Edge Cases' });
    }
    if (result.missingEdgeCases && result.missingEdgeCases.length > 0) {
      items.push({ id: 'missingedgecases', label: '6. Missed Cases' });
    }
    if (result.pattern) {
      items.push({ id: 'pattern', label: '7. DSA Pattern' });
    }
    if (result.hints && result.hints.length > 0) {
      items.push({ id: 'hints', label: '8. Progressive Hints' });
    }
    if (result.approaches && result.approaches.length > 0) {
      items.push({ id: 'approaches', label: '9. Approaches' });
    }
    if (result.pseudocode && result.pseudocode.length > 0) {
      items.push({ id: 'pseudocode', label: '10. Pseudocode' });
    }
    if (result.codes && result.codes.length > 0) {
      items.push({ id: 'code', label: '11. Solutions' });
    }
    if (complexityRows.length > 0) {
      items.push({ id: 'complexity', label: '12. Complexity' });
    }
    if (result.dryRun) {
      items.push({ id: 'dryrun', label: '13. Dry Run' });
    }
    if (result.comparison && result.comparison.length > 0) {
      items.push({ id: 'comparison', label: '14. Comparison Table' });
    }
    if (result.interviewExplanation) {
      items.push({ id: 'interviewExplanation', label: '15. Interview Guide' });
    }
    if (result.userCodeReview || result.approachImprovement) {
      items.push({ id: 'approachImprovement', label: '16. Improve Logic' });
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
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link
            to="/problems"
            className="back-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              transition: 'color 0.15s ease'
            }}
          >
            <ArrowLeft size={14} /> My Problems
          </Link>
          {analysis.problem && (
            <Link
              to={typeof analysis.problem === 'object' ? `/problems/${analysis.problem._id}` : `/problems/${analysis.problem}`}
              className="back-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                transition: 'color 0.15s ease'
              }}
            >
              <BookOpen size={14} /> View Details
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            to="/problems/new"
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Analyse Again
          </Link>
          <Link
            to="/problems"
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            History
          </Link>
        </div>
      </div>

      {/* Header metadata block */}
      <header className="analysis-header-banner" style={{ padding: '16px 24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div className="analysis-banner-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="analysis-banner-title-block">
            <span className="analysis-banner-label" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', display: 'block' }}>
              PERSONALISED DSA LESSON
            </span>
            <h1 className="analysis-banner-title" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>
              {analysis.inputSnapshot?.title || 'Untitled DSA Problem'}
            </h1>
          </div>
          {(() => {
            const norm = (analysis.status || '').toLowerCase();
            let label = 'Unknown';
            let bg = 'var(--bg-soft)';
            let color = 'var(--text-secondary)';
            if (norm === 'completed') {
              label = 'Completed';
              bg = 'var(--primary-soft)';
              color = 'var(--primary)';
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
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                  backgroundColor: bg,
                  color: color,
                  border: `1px solid ${color}33`,
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                {label}
              </span>
            );
          })()}
        </div>

        <div className="analysis-meta-strip" style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {analysis.inputSnapshot?.language && (
            <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Language:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{getLanguageLabel(analysis.inputSnapshot.language)}</strong>
            </div>
          )}

          {(analysis.inputSnapshot?.difficulty || (analysis.problem && typeof analysis.problem === 'object' && analysis.problem.difficulty)) && (
            <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Difficulty:</span>
              <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {analysis.inputSnapshot?.difficulty || analysis.problem.difficulty}
              </strong>
            </div>
          )}

          {analysis.requestedSections && analysis.requestedSections.length > 0 && (
            <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mode:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{inferModeLabel(analysis.requestedSections)}</strong>
            </div>
          )}

          {analysis.result?.pattern?.name && (
            <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pattern:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{analysis.result.pattern.name}</strong>
            </div>
          )}

          <div className="analysis-meta-block" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} style={{ color: 'var(--text-muted)' }} />
            <span>Updated: <strong style={{ color: 'var(--text-primary)' }}>{new Date(analysis.updatedAt).toLocaleDateString()}</strong></span>
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
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
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

          {status === 'completed' && (
            <>
              {/* 1. Problem in Simple Words */}
              {result.problemExplanation && (
                <section id="problemExplanation" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    1. Problem in Simple Words
                  </h3>
                  <p className="learning-body-text" style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{result.problemExplanation}</p>
                </section>
              )}

              {/* 2. Input and Output */}
              {result.inputOutput && (
                <section id="inputOutput" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    2. Input and Output
                  </h3>
                  <p className="learning-body-text" style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{result.inputOutput}</p>
                </section>
              )}

              {/* 3. Example Walkthrough */}
              {result.exampleExplanation && result.exampleExplanation.length > 0 && (
                <section id="examples" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    3. Example Walkthrough
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

              {/* 4. Constraints */}
              {result.constraints && result.constraints.length > 0 && (
                <section id="constraints" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    4. Constraints
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.constraints.map((c, idx) => (
                      <div key={idx} style={{ padding: '12px 16px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <code style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--primary)' }}>{c.constraint}</code>
                        <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                          <strong>Implication:</strong> {c.implication}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. Important Edge Cases */}
              {result.edgeCases && result.edgeCases.length > 0 && (
                <section id="edgeCases" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    5. Important Edge Cases
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.edgeCases.map((ec, idx) => (
                      <div key={idx} style={{ padding: '12px 16px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--primary)' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{ec.case}</strong>
                        <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                          <strong>Reason:</strong> {ec.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 6. Missing Edge Cases */}
              {result.missingEdgeCases && result.missingEdgeCases.length > 0 && (
                <section id="missingedgecases" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    6. Missing Edge Cases
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

              {/* 7. DSA Pattern */}
              {result.pattern && (
                <section id="pattern" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    7. DSA Pattern
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

              {/* 8. Progressive Hints */}
              {result.hints && result.hints.length > 0 && (
                <section id="hints" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    8. Progressive Hints
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
                </section>
              )}

              {/* 9. Approaches */}
              {result.approaches && result.approaches.length > 0 && (
                <section id="approaches" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    9. Approaches
                  </h3>
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
                </section>
              )}

              {/* 10. Pseudocode */}
              {result.pseudocode && result.pseudocode.length > 0 && (
                <section id="pseudocode" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    10. Pseudocode
                  </h3>
                  <div className="monospace-block" style={{ backgroundColor: 'var(--bg-page)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {result.pseudocode.map((line, idx) => (
                      <div key={idx} className="pseudocode-line" style={{ display: 'flex', gap: '12px', fontSize: '12.5px', fontFamily: 'monospace', lineHeight: '1.6' }}>
                        <span className="line-num" style={{ color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{idx + 1}</span>
                        <span className="line-text" style={{ color: 'var(--text-primary)' }}>{line}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 11. Solutions */}
              {result.codes && result.codes.length > 0 && (
                <section id="code" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    11. Solutions
                  </h3>
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
                </section>
              )}

              {/* 12. Time and Space Complexity */}
              {complexityRows.length > 0 && (
                <section id="complexity" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    12. Time and Space Complexity
                  </h3>
                  <div className="comparison-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <table className="comparison-table-view" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Approach</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Time Complexity</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Space Complexity</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Why</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complexityRows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < complexityRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{row.approach}</td>
                            <td style={{ padding: '12px' }}><code style={{ color: 'var(--primary)', fontWeight: '700' }}>{row.timeComplexity}</code></td>
                            <td style={{ padding: '12px' }}><code style={{ color: 'var(--ai-accent)', fontWeight: '700' }}>{row.spaceComplexity}</code></td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                <strong>Time:</strong> {row.timeReason}
                                <br />
                                <strong>Space:</strong> {row.spaceReason}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* 13. Dry Run */}
              {result.dryRun && (
                <section id="dryrun" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    13. Dry Run Tracing
                  </h3>
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
                </section>
              )}

              {/* 14. Approaches Comparison */}
              {result.comparison && result.comparison.length > 0 && (
                <section id="comparison" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    14. Approaches Comparison
                  </h3>
                  <div className="comparison-table-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <table className="comparison-table-view" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Approach</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Main Idea</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Space</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Advantages</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Limitations</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Best Used When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.comparison.map((row, idx) => {
                          const isOptimal = row.approach?.toLowerCase().includes('optimal') || row.interviewSuitability?.toLowerCase().includes('recommended') || row.recommendedUse?.toLowerCase().includes('recommended') || row.recommendedUse?.toLowerCase().includes('optimal');
                          return (
                            <tr key={idx} style={{ 
                              borderBottom: idx < result.comparison.length - 1 ? '1px solid var(--border)' : 'none',
                              backgroundColor: isOptimal ? 'var(--bg-soft)' : 'transparent',
                              fontWeight: isOptimal ? '600' : 'normal'
                            }}>
                              <td style={{ padding: '12px', fontWeight: '700', color: isOptimal ? 'var(--primary)' : 'var(--text-primary)' }}>{row.approach}</td>
                              <td style={{ padding: '12px' }}>{row.mainIdea || row.approach}</td>
                              <td style={{ padding: '12px' }}><code>{row.timeComplexity}</code></td>
                              <td style={{ padding: '12px' }}><code>{row.spaceComplexity}</code></td>
                              <td style={{ padding: '12px' }}>
                                <ul className="bullet-td-list" style={{ margin: 0, paddingLeft: '16px' }}>
                                  {row.advantages?.map((adv, aIdx) => <li key={aIdx}>{adv}</li>)}
                                </ul>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <ul className="bullet-td-list" style={{ margin: 0, paddingLeft: '16px' }}>
                                  {(row.limitations || row.disadvantages)?.map((lim, lIdx) => <li key={lIdx}>{lim}</li>)}
                                </ul>
                              </td>
                              <td style={{ padding: '12px' }}>{row.recommendedUse || row.interviewSuitability}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* 15. Interview Explanation */}
              {result.interviewExplanation && (
                <section id="interviewExplanation" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    15. Interview Explanation
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

              {/* 16. How to Improve the Approach */}
              {(result.userCodeReview || result.approachImprovement) && (
                <section id="approachImprovement" className="learning-section" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <h3 className="learning-section-title" style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '800', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    16. How to Improve the Approach
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
      )}
    </div>
  );
};

export default AnalysisDetailPage;
export { AnalysisDetailPage };
