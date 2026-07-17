import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getPracticeDashboard, getPracticeRecommendations, getAiUsage } from '../api/practice.api.js';
import { getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getMyProblems } from '../api/problem.api.js';
import FormError from '../components/common/FormError.jsx';
import { Target, RefreshCw, Code, Calendar, TrendingUp, Clock, ListTodo, ArrowRight, Search, Link2 } from 'lucide-react';


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

  const getRecommendationTheme = (pattern = '') => {
    const pat = pattern.toLowerCase();
    if (pat.includes('pointer') || pat.includes('linked list') || pat.includes('list') || pat.includes('link')) {
      return {
        bg: '#F0EEFF',
        color: '#6D5CE7',
        icon: <Link2 size={16} />
      };
    } else if (pat.includes('stack') || pat.includes('recursion') || pat.includes('tree') || pat.includes('graph') || pat.includes('parentheses')) {
      return {
        bg: 'var(--warning-soft)',
        color: 'var(--warning)',
        icon: <Code size={16} />
      };
    } else if (pat.includes('search') || pat.includes('binary') || pat.includes('sliding') || pat.includes('window')) {
      return {
        bg: '#EAF0F6',
        color: '#0A7DFF',
        icon: <Search size={16} />
      };
    } else {
      return {
        bg: 'var(--primary-soft)',
        color: 'var(--primary)',
        icon: <Code size={16} />
      };
    }
  };

  return (
    <div className="db-redesign db-page-container">
      {error && (
        <div className="db-error-inline">
          <FormError message={error} />
          <button className="db-btn-text" onClick={() => fetchDashboardAndRecommendations(true)}>Retry</button>
        </div>
      )}

      {/* 1. TOP HERO / FOCUS AREA */}
      <section className="db-hero-section">
        <div className="db-hero-left">
          <span className="db-eyebrow">YOUR LEARNING WORKSPACE</span>
          <h1 className="db-heading">Continue building your<br />problem-solving process.</h1>
          <p className="db-subheading">Learn with intent. Revise with purpose. Improve every day.</p>
          <div className="db-principles">
            <div className="db-principle-tag">
              <Target size={14} className="db-principle-icon" />
              <span>Learn with Focus</span>
            </div>
            <div className="db-principle-tag">
              <RefreshCw size={14} className="db-principle-icon" />
              <span>Revise Intelligently</span>
            </div>
            <div className="db-principle-tag">
              <Code size={14} className="db-principle-icon" />
              <span>Practice Consistently</span>
            </div>
          </div>
        </div>
        <div className="db-hero-right">
          <div className="db-focus-panel">
            <div className="db-focus-header">
              <Target size={16} className="db-focus-header-icon" />
              <h3>Today's Focus</h3>
            </div>
            <div className="db-focus-body">
              <div className="db-focus-row">
                <div className="db-focus-row-label">
                  <ListTodo size={16} />
                  <span>Problems Planned</span>
                </div>
                <span className="db-focus-row-value">{revisionDueCount}</span>
              </div>
              <div className="db-focus-row">
                <div className="db-focus-row-label">
                  <Clock size={16} />
                  <span>Est. Time</span>
                </div>
                <span className="db-focus-row-value">
                  {revisionDueCount > 0 ? `${revisionDueCount * 30} min` : '0 min'}
                </span>
              </div>
              <div className="db-focus-row">
                <div className="db-focus-row-label">
                  <TrendingUp size={16} />
                  <span>Confidence Goal</span>
                </div>
                <span className="db-focus-row-value db-focus-goal">
                  {topWeakPatterns.length > 0 ? 'Improve' : 'Not set'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="db-divider-main"></div>

      <div className="db-main-layout">
        <div className="db-col-main">
          {/* 2. CURRENT LEARNING */}
          <section className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title">Current Learning</h2>
            </div>
            {continueProblem ? (
              <div className="db-current-learning-container">
                <div className="db-current-learning-left">
                  <div className="db-icon-tile">
                    <Code size={20} />
                  </div>
                  <div className="db-current-learning-details">
                    <h3 className="db-current-problem-title">{continueProblem.title}</h3>
                    <div className="db-current-problem-badges">
                      <span className={`db-badge badge-${(continueProblem.difficulty || 'medium').toLowerCase()}`}>
                        {continueProblem.difficulty || 'Medium'}
                      </span>
                      <span className="db-badge badge-pattern">
                        {continueProblem.patterns && continueProblem.patterns.length > 0 ? continueProblem.patterns[0] : 'Uncategorised'}
                      </span>
                    </div>
                    <span className="db-current-last-activity">
                      Last activity: {new Date(continueProblem.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="db-current-learning-actions">
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
              <div className="db-empty-state-compact">
                <Code size={20} className="db-empty-icon" />
                <div className="db-empty-text-group">
                  <p className="db-empty-title">No active problem yet</p>
                  <p className="db-empty-desc">Start with a problem you want to understand deeply.</p>
                </div>
                <Link to="/problems/new" className="db-btn-primary">Learn a Problem</Link>
              </div>
            )}
          </section>

          <div className="db-divider-sub"></div>

          {/* 3. RECOMMENDED NEXT */}
          <section className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title">Recommended Next</h2>
              <p className="db-section-subtitle">Practice chosen from your weak areas and recent attempts.</p>
            </div>
            {allRecs.length === 0 ? (
              <div className="db-empty-state-compact">
                <Search size={20} className="db-empty-icon" />
                <div className="db-empty-text-group">
                  <p className="db-empty-title">No recommendations yet</p>
                  <p className="db-empty-desc">Complete one problem so AlgoMentor can personalise your practice.</p>
                </div>
              </div>
            ) : (
              <div className="db-rec-list">
                {allRecs.map((rec, idx) => {
                  const theme = getRecommendationTheme(rec.pattern);
                  return (
                    <div key={idx} className="db-rec-row">
                      <div className="db-rec-left">
                        <div className="db-rec-icon" style={{ backgroundColor: theme.bg, color: theme.color }}>
                          {theme.icon}
                        </div>
                        <div className="db-rec-details">
                          <h4 className="db-rec-title">{rec.title}</h4>
                          <div className="db-rec-badges">
                            <span className={`db-badge badge-${(rec.difficulty || 'medium').toLowerCase()}`}>
                              {rec.difficulty || 'Medium'}
                            </span>
                            <span className="db-badge badge-pattern" style={{ backgroundColor: theme.bg, color: theme.color }}>
                              {rec.pattern || 'Pattern'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="db-rec-desc">{rec.reason}</p>
                      <button
                        onClick={() => navigate('/problems/new', { state: { recommendedProblem: rec } })}
                        className="db-rec-action"
                      >
                        Start <ArrowRight size={14} />
                      </button>
                    </div>
                  );
                })}
                <div className="db-rec-more-link">
                  <button onClick={() => navigate('/problems/new')} className="db-rec-more-btn">
                    View more recommendations <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="db-col-side">
          {/* 4. REVISE TODAY */}
          <section className="db-section">
            <div className="db-section-header">
              <div className="db-section-title-with-icon">
                <Calendar size={18} className="db-warning-icon" />
                <h2 className="db-section-title">Revise Today</h2>
              </div>
              <p className="db-section-subtitle">Problems due for recall before the solution fades.</p>
            </div>
            {reviseToday.length === 0 ? (
              <div className="db-revise-empty-card">
                <div className="db-revise-empty-icon-box">
                  <Calendar size={18} />
                </div>
                <div className="db-revise-empty-text">
                  <h4>Nothing is due today</h4>
                  <p>Your next revision will appear here when scheduled.</p>
                </div>
              </div>
            ) : (
              <div className="db-revise-list">
                {reviseToday.slice(0, 3).map((problem) => {
                  const isUrgent = problem.confidence < 50;
                  return (
                    <div key={problem._id} className="db-revise-row">
                      <div className="db-revise-left">
                        <h4 className="db-revise-title">{problem.title}</h4>
                        <div className="db-revise-meta">
                          <span>{problem.patterns?.[0] || 'Uncategorised'}</span>
                          <span className="db-meta-dot">·</span>
                          <span>Confidence: {problem.confidence || 0}%</span>
                        </div>
                        <div className={isUrgent ? 'db-revise-badge-urgent' : 'db-revise-badge-due'}>
                          Due today
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenProblem(problem)}
                        disabled={openLoadings[problem._id]}
                        className="db-revise-action"
                      >
                        Review <ArrowRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="db-divider-side"></div>

          {/* 5. WEAK PATTERNS */}
          <section className="db-section">
            <div className="db-section-header">
              <div className="db-section-title-with-icon">
                <TrendingUp size={18} className="db-ai-icon" />
                <h2 className="db-section-title">Weak Patterns</h2>
              </div>
              <p className="db-section-subtitle">Patterns that need more deliberate practice.</p>
            </div>
            {topWeakPatterns.length === 0 ? (
              <div className="db-revise-empty-card">
                <div className="db-revise-empty-icon-box" style={{ backgroundColor: 'var(--ai-soft)', color: 'var(--ai-accent)' }}>
                  <TrendingUp size={18} />
                </div>
                <div className="db-revise-empty-text">
                  <h4>No weak patterns yet</h4>
                  <p>Weak patterns will appear after a few analysed problems.</p>
                </div>
              </div>
            ) : (
              <div className="db-weak-patterns-list">
                {topWeakPatterns.slice(0, 4).map((pat, idx) => (
                  <div key={idx} className="db-weak-pattern-row">
                    <span className="db-weak-pattern-name">{pat.pattern}</span>
                    <div className="db-weak-pattern-bar-bg">
                      <div
                        className="db-weak-pattern-bar-fill"
                        style={{
                          width: `${Math.round(pat.confidenceScore)}%`,
                          backgroundColor: idx === 0 ? '#6D5CE7' : idx === 1 ? '#0A7DFF' : idx === 2 ? '#168B62' : '#374151'
                        }}
                      ></div>
                    </div>
                    <span className="db-weak-pattern-pct">{Math.round(pat.confidenceScore)}%</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="db-divider-side"></div>

          {/* 6. THIS WEEK */}
          <section className="db-section">
            <div className="db-section-header" style={{ marginBottom: '12px' }}>
              <div className="db-section-title-with-icon">
                <TrendingUp size={18} className="db-primary-icon" />
                <h2 className="db-section-title">This Week</h2>
              </div>
            </div>
            <div className="db-this-week-body">
              <p className="db-this-week-stats">
                {totalProblems} problems studied <span className="db-meta-dot">·</span> {completedProblems} revisions completed <span className="db-meta-dot">·</span> {usageData?.analysisRequests || 0} hints used
              </p>
              {weeklyInsight && (
                <p className="db-this-week-insight">{weeklyInsight}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
