import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getPracticeDashboard, getPracticeRecommendations, getAiUsage } from '../api/practice.api.js';
import { getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getMyProblems } from '../api/problem.api.js';
import FormError from '../components/common/FormError.jsx';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [recommendationData, setRecommendationData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [continueProblem, setContinueProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLoadings, setOpenLoadings] = useState({});

  const fetchDashboardAndRecommendations = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      const [dash, recs, usage, probList] = await Promise.all([
        getPracticeDashboard(),
        getPracticeRecommendations(),
        getAiUsage().catch((e) => {
          console.error('Failed to load usage limits:', e);
          return null;
        }),
        getMyProblems({ limit: 1 }).catch((e) => {
          console.error('Failed to load recent problem:', e);
          return null;
        }),
      ]);
      setDashboardData(dash);
      setRecommendationData(recs);
      setUsageData(usage);
      if (probList && probList.problems && probList.problems.length > 0) {
        setContinueProblem(probList.problems[0]);
      } else {
        setContinueProblem(null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not retrieve practice data. Please refresh or retry.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardAndRecommendations();
  }, []);

  const handleOpenProblem = async (problem) => {
    const pId = problem._id;
    const status = (problem.status || '').toLowerCase();

    if (status === 'completed') {
      setOpenLoadings((prev) => ({ ...prev, [pId]: true }));
      try {
        const analysis = await getLatestProblemAnalysis(pId);
        navigate(`/analyses/${analysis._id}`);
      } catch (err) {
        navigate(`/problems/${pId}`);
      } finally {
        setOpenLoadings((prev) => ({ ...prev, [pId]: false }));
      }
    } else {
      navigate(`/problems/${pId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="db-redesign db-loading-skeleton">
        <div className="db-skel-header"></div>
        <div className="db-skel-panel"></div>
        <div className="db-skel-row"></div>
        <div className="db-skel-row"></div>
      </div>
    );
  }

  const {
    totalProblems = 0,
    completedProblems = 0,
    revisionDueCount = 0,
    topWeakPatterns = [],
    reviseToday = [],
  } = dashboardData || {};

  const {
    weakPatternPractice = [],
    importantInterviewPatterns = [],
    nextDifficultyStep = [],
  } = recommendationData?.recommendations || {};

  const allRecs = [
    ...weakPatternPractice.map(r => ({ ...r, category: 'weak' })),
    ...importantInterviewPatterns.map(r => ({ ...r, category: 'interview' })),
    ...nextDifficultyStep.map(r => ({ ...r, category: 'nextStep' }))
  ].slice(0, 3);

  let weeklyInsight = null;
  if (topWeakPatterns.length > 0) {
    weeklyInsight = `You are improving in problem-solving, but ${topWeakPatterns[0].pattern.toLowerCase()} confidence still needs work.`;
  } else if (totalProblems > 0) {
    weeklyInsight = "You're building a solid foundation. Keep reviewing regularly.";
  }

  return (
    <div className="db-redesign db-page-container">
      {error && (
        <div className="db-error-inline">
          <FormError message={error} />
          <button className="db-btn-text" onClick={() => fetchDashboardAndRecommendations(true)}>Retry</button>
        </div>
      )}

      {/* 1. PAGE INTRODUCTION */}
      <section className="db-intro">
        <div className="db-intro-content">
          <span className="db-intro-eyebrow">Your learning workspace</span>
          <h1 className="db-intro-heading">Continue building your problem-solving process.</h1>
          <p className="db-intro-support">Pick up where you stopped, revise weak patterns, and practise what will help you improve next.</p>
        </div>
        <div className="db-intro-action">
          <Link to="/problems/new" className="db-btn-primary">Learn a Problem</Link>
        </div>
      </section>

      <div className="db-divider-main"></div>

      <div className="db-main-layout">
        <div className="db-col-main">
          {/* 2. CURRENT LEARNING */}
          <section className="db-section">
            <h2 className="db-section-title">Current Learning</h2>
            {continueProblem ? (
              <div className="db-current-panel">
                <div className="db-current-info">
                  <h3 className="db-current-title">{continueProblem.title}</h3>
                  <div className="db-current-meta">
                    <span>{continueProblem.difficulty || 'Medium'}</span>
                    <span className="db-meta-dot">·</span>
                    <span>{continueProblem.patterns && continueProblem.patterns.length > 0 ? continueProblem.patterns[0] : 'Uncategorised'}</span>
                  </div>
                  <div className="db-current-status">
                    Last activity: {new Date(continueProblem.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="db-current-actions">
                  <button
                    onClick={() => handleOpenProblem(continueProblem)}
                    disabled={openLoadings[continueProblem._id]}
                    className="db-btn-secondary"
                  >
                    View Problem
                  </button>
                  <button
                    onClick={() => handleOpenProblem(continueProblem)}
                    disabled={openLoadings[continueProblem._id]}
                    className="db-btn-primary"
                  >
                    {openLoadings[continueProblem._id] ? 'Loading...' : 'Continue Learning'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="db-current-panel db-empty-current">
                <p className="db-empty-text">No active problem yet.<br/>Start with a problem you want to understand deeply.</p>
                <Link to="/problems/new" className="db-btn-primary" style={{ marginTop: '12px' }}>Learn a Problem</Link>
              </div>
            )}
          </section>

          {/* 3. RECOMMENDED NEXT */}
          <section className="db-section" style={{ marginTop: '48px' }}>
            <div className="db-section-header">
              <h2 className="db-section-title">Recommended Next</h2>
              <p className="db-section-subtitle">Practice chosen from your weak areas and recent attempts.</p>
            </div>
            {allRecs.length === 0 ? (
              <div className="db-empty-row">
                <p>No recommendations yet. Complete one problem so AlgoMentor can personalise your practice.</p>
              </div>
            ) : (
              <div className="db-list">
                {allRecs.map((rec, idx) => (
                  <div key={idx} className="db-list-row">
                    <div className="db-row-content">
                      <h4 className="db-row-title">{rec.title}</h4>
                      <div className="db-row-meta">
                        <span>{rec.difficulty || 'Medium'}</span>
                        <span className="db-meta-dot">·</span>
                        <span>{rec.pattern || 'Pattern'}</span>
                      </div>
                      <p className="db-row-desc">{rec.reason}</p>
                    </div>
                    <div className="db-row-action">
                      {rec.category === 'weak' && <span className="db-priority-label">High Priority</span>}
                      <button
                        onClick={() => navigate('/problems/new', { state: { recommendedProblem: rec } })}
                        className="db-btn-text"
                      >
                        Start →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="db-col-side">
          {/* 4. REVISE TODAY */}
          <section className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title">Revise Today</h2>
              <p className="db-section-subtitle">Problems due for recall before the solution fades.</p>
            </div>
            {reviseToday.length === 0 ? (
              <div className="db-empty-row">
                <p>Nothing is due today. Your next revision will appear here when scheduled.</p>
              </div>
            ) : (
              <div className="db-list">
                {reviseToday.slice(0, 3).map((problem) => {
                  const isUrgent = problem.confidence < 50;
                  return (
                    <div key={problem._id} className="db-compact-row">
                      <div className="db-compact-content">
                        <h4 className="db-compact-title">{problem.title}</h4>
                        <div className="db-compact-meta">
                          <span>{problem.patterns?.[0] || 'Uncategorised'}</span>
                          <span className="db-meta-dot">·</span>
                          <span>Confidence: {problem.confidence || 0}%</span>
                        </div>
                        <div className={`db-due-status ${isUrgent ? 'db-urgent' : ''}`}>
                          Due today
                        </div>
                      </div>
                      <div className="db-compact-action">
                        <button
                          onClick={() => handleOpenProblem(problem)}
                          disabled={openLoadings[problem._id]}
                          className="db-btn-text"
                        >
                          Review →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 5. WEAK PATTERNS */}
          <section className="db-section" style={{ marginTop: '48px' }}>
            <div className="db-section-header">
              <h2 className="db-section-title">Weak Patterns</h2>
              <p className="db-section-subtitle">Patterns that need more deliberate practice.</p>
            </div>
            {topWeakPatterns.length === 0 ? (
              <div className="db-empty-row">
                <p>Weak patterns will appear after a few analysed problems.</p>
              </div>
            ) : (
              <div className="db-progress-list">
                {topWeakPatterns.slice(0, 4).map((pat, idx) => (
                  <div key={idx} className="db-progress-row">
                    <div className="db-progress-labels">
                      <span className="db-progress-name">{pat.pattern}</span>
                      <span className="db-progress-val">{Math.round(pat.confidenceScore)}%</span>
                    </div>
                    <div className="db-progress-track">
                      <div className="db-progress-fill" style={{ width: `${Math.round(pat.confidenceScore)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 6. THIS WEEK */}
          <section className="db-section" style={{ marginTop: '48px' }}>
            <h2 className="db-section-title">This Week</h2>
            <div className="db-weekly-summary">
              <p className="db-weekly-stats">
                {totalProblems} problems studied <span className="db-meta-dot">·</span> {completedProblems} revisions completed <span className="db-meta-dot">·</span> {usageData?.analysisRequests || 0} hints used
              </p>
              {weeklyInsight && (
                <p className="db-weekly-insight">{weeklyInsight}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
