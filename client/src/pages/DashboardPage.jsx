import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getPracticeDashboard, getPracticeRecommendations, getAiUsage, updateRecommendationProgress } from '../api/practice.api.js';
import { getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getMyProblems } from '../api/problem.api.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { PlusCircle, MoreVertical, BookOpen, Sparkles, RefreshCw, ChevronRight, Play } from 'lucide-react';

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
  const [activeRecFeedback, setActiveRecFeedback] = useState(null);

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : (user?.username || 'Student');

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

  const handleFeedback = async (recKey, feedbackVal) => {
    try {
      await updateRecommendationProgress(recKey, { feedback: feedbackVal });
      setActiveRecFeedback(null);
      await fetchDashboardAndRecommendations(false);
    } catch (err) {
      alert('Failed to save feedback: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="loader-container" style={{ minHeight: '50vh' }}>
        <Loader text="Loading your learning workspace..." />
      </div>
    );
  }

  const {
    totalProblems = 0,
    completedProblems = 0,
    revisionDueCount = 0,
    masteredCount = 0,
    learningCount = 0,
    weakCount = 0,
    topWeakPatterns = [],
    reviseToday = [],
  } = dashboardData || {};

  const {
    weakPatternPractice = [],
    importantInterviewPatterns = [],
    nextDifficultyStep = [],
  } = recommendationData?.recommendations || {};

  const getWeaknessSignal = (pat) => {
    if (pat.bruteForceDependenceCount > 0) return 'Brute force dependence';
    if (pat.missedEdgeCaseCount > 0) return 'Repeated missed edge cases';
    if (pat.codeIssueCount > 0) return 'Code logic bugs';
    return 'Needs general practice';
  };


  const allRecs = [
    ...weakPatternPractice.map(r => ({ ...r, category: 'weak' })),
    ...importantInterviewPatterns.map(r => ({ ...r, category: 'interview' })),
    ...nextDifficultyStep.map(r => ({ ...r, category: 'nextStep' }))
  ].slice(0, 3);

  return (
    <div className="dashboard-page">
      
      {/* Top Row: Welcome strip and AI usage widget */}
      <div className="dashboard-top-grid">
        
        {/* Welcome strip */}
        <div className="db-welcome-panel">
          <div>
            <h1 className="db-welcome-title">Good evening, {firstName} 👋</h1>
            <p className="db-welcome-subtitle">Ready for one focused DSA session?</p>
          </div>
          <div>
            <Link to="/problems/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', height: '44px', borderRadius: '8px' }}>
              <PlusCircle size={16} />
              <span>Start a Problem</span>
            </Link>
          </div>
        </div>

        {/* AI usage widget */}
        {usageData ? (
          <div className="db-ai-usage-card">
            <div className="db-ai-header">
              <span className="db-ai-title">AI Usage Today</span>
              <span className="db-ai-value">
                {usageData.analysisRequests} / {usageData.limits?.analysisRequests || 50}
              </span>
            </div>
            
            {/* Thin progress bar */}
            <div className="db-ai-progress-bar">
              <div style={{
                width: `${Math.min(100, Math.round(((usageData.analysisRequests || 0) / (usageData.limits?.analysisRequests || 50)) * 100))}%`
              }}></div>
            </div>

            <div className="db-ai-subtext">
              {usageData.remaining?.analysisRequests || 0} remaining analyses
            </div>
          </div>
        ) : (
          <div className="db-ai-usage-card">
            <span className="db-ai-title">AI Usage Today</span>
            <div className="db-ai-subtext">Usage statistics not available.</div>
          </div>
        )}
      </div>

      {error && <FormError message={error} />}

      {/* Main Content Row: Two columns */}
      <div className="dashboard-content-grid">
        
        {/* Left Column: Continue Learning and Recommended For You */}
        <div className="db-left-col">
          
          {/* Continue Learning card */}
          <section className="db-card-panel continue-learning-card" style={{ minHeight: '245px', padding: '24px' }}>
            <div className="db-continue-bg-accent"></div>
            <h3 className="db-section-header" style={{ fontSize: '18px', marginBottom: '16px' }}>Continue Learning</h3>

            {continueProblem ? (
              <div className="continue-learning-box-content">
                <div>
                  <h4 className="continue-problem-title" style={{ fontSize: '22px' }}>{continueProblem.title}</h4>
                  <div className="continue-problem-tags" style={{ marginTop: '8px' }}>
                    {continueProblem.patterns && continueProblem.patterns.length > 0 && (
                      <span className="continue-meta-tag">💡 {continueProblem.patterns[0]}</span>
                    )}
                    <span className="continue-problem-sub-meta">
                      • Status: <StatusBadge status={continueProblem.status} />
                    </span>
                  </div>
                </div>

                <div className="continue-problem-activity" style={{ fontSize: '14px', color: '#667085' }}>
                  You were analysing hints
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', zIndex: 5 }}>
                  <span className="continue-problem-sub-meta" style={{ fontSize: '13px' }}>
                    Last activity: {new Date(continueProblem.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleOpenProblem(continueProblem)}
                    disabled={openLoadings[continueProblem._id]}
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '700', height: '42px', borderRadius: '8px' }}
                  >
                    {openLoadings[continueProblem._id] ? 'Opening...' : 'Continue'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="continue-learning-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', flexGrow: 1, padding: '20px' }}>
                <h4 className="continue-empty-title" style={{ fontSize: '18px', fontWeight: '700', color: '#17212B', margin: 0 }}>
                  Start your first learning session
                </h4>
                <p className="continue-empty-text" style={{ fontSize: '14px', color: '#667085', margin: 0, textAlign: 'center', maxWidth: '480px' }}>
                  Add a problem and AlgoMentor will begin building your personalised learning path from your real attempts.
                </p>
                <Link to="/problems/new" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '700', height: '42px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', marginTop: '8px' }}>
                  Analyse a Problem
                </Link>
              </div>
            )}
          </section>

          {/* Recommended For You */}
          <section className="db-card-panel">
            <div className="db-section-header-row" style={{ marginBottom: '20px' }}>
              <h3 className="db-section-header">Recommended For You</h3>
            </div>

            {allRecs.length === 0 ? (
              <div className="revision-empty-box" style={{ padding: '36px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#667085' }}>Complete analyses to unlock personalized recommended problems.</p>
              </div>
            ) : (
              <div className="db-recs-grid">
                {allRecs.map((rec, idx) => (
                  <div key={idx} className="db-rec-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span className={`difficulty-indicator-${rec.difficulty || 'unknown'}`}>
                        {rec.difficulty || 'medium'}
                      </span>

                      {/* Feedback three-dot menu */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setActiveRecFeedback(activeRecFeedback === idx ? null : idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {activeRecFeedback === idx && (
                          <div className="db-feedback-dropdown">
                            <span className="db-dropdown-title">Feedback</span>
                            <button onClick={() => handleFeedback(rec.recommendationKey, 'tooEasy')}>Too Easy</button>
                            <button onClick={() => handleFeedback(rec.recommendationKey, 'tooDifficult')}>Too Difficult</button>
                            <button onClick={() => handleFeedback(rec.recommendationKey, 'notRelevant')}>Not Relevant</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <strong className="db-rec-title">{rec.title}</strong>
                    {rec.pattern && <span className="db-rec-pattern">💡 {rec.pattern}</span>}
                    <p className="db-rec-reason">{rec.reason}</p>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
                      <button
                        onClick={() => navigate('/problems/new', {
                          state: {
                            recommendedTitle: rec.title,
                            topic: rec.topic,
                            pattern: rec.pattern,
                            focus: rec.focus,
                            recommendationKey: rec.recommendationKey
                          }
                        })}
                        className="btn btn-primary btn-block"
                        style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '700', height: '42px', borderRadius: '8px' }}
                      >
                        Practise
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Right Column: Today's Revision, Weak Patterns, and Weekly Progress */}
        <div className="db-right-col">
          
          {/* Today's Revision */}
          <section className="db-card-panel" style={{ padding: '20px' }}>
            <div className="db-section-header-row" style={{ marginBottom: '16px' }}>
              <h3 className="db-section-header" style={{ fontSize: '17px' }}>Today’s Revision</h3>
              {revisionDueCount > 0 && (
                <Link to="/revise" className="db-view-all-link">
                  View all
                </Link>
              )}
            </div>

            {reviseToday.length === 0 ? (
              <div className="revision-empty-box" style={{ padding: '28px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#667085' }}>You are caught up for today.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviseToday.slice(0, 3).map((problem) => (
                  <div key={problem._id} className="revision-item-row">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="revision-item-title">{problem.title}</span>
                      <div className="revision-item-meta">
                        {problem.patterns && problem.patterns.length > 0 && (
                          <span className="revision-item-pattern">{problem.patterns[0]}</span>
                        )}
                        <span>Confidence: {problem.confidence || 0}%</span>
                        {problem.nextRevisionAt && (
                          <span>• Due today</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenProblem(problem)}
                      disabled={openLoadings[problem._id]}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', height: '32px', borderRadius: '8px' }}
                    >
                      {openLoadings[problem._id] ? 'Opening...' : 'Revise'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Weak Patterns */}
          <section className="db-card-panel" style={{ padding: '20px' }}>
            <div className="db-section-header-row" style={{ marginBottom: '16px' }}>
              <h3 className="db-section-header" style={{ fontSize: '17px' }}>Weak Patterns</h3>
              {topWeakPatterns.length > 0 && (
                <Link to="/revise" className="db-view-all-link">
                  View all
                </Link>
              )}
            </div>

            {topWeakPatterns.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#667085', margin: 0, padding: '12px 0' }}>
                No weakness patterns detected yet. Complete reviews to see weak patterns.
              </p>
            ) : (
              <div className="db-weak-list">
                {topWeakPatterns.slice(0, 4).map((pat, idx) => (
                  <div key={idx} className="db-weak-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="db-weak-name">{pat.pattern}</span>
                      <span className="db-weak-pct">{Math.round(pat.confidenceScore)}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="db-weak-progress-bar">
                      <div style={{ width: `${Math.round(pat.confidenceScore)}%` }}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '12px', flexWrap: 'wrap' }}>
                      <span className="db-weak-signal">
                        {getWeaknessSignal(pat)}
                      </span>
                      <button
                        onClick={() => navigate('/problems/new', { state: { topic: pat.topic, pattern: pat.pattern } })}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 12px', fontSize: '12px', height: '28px', fontWeight: '700', borderRadius: '6px' }}
                      >
                        Practise
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Weekly Progress */}
          <section className="db-card-panel">
            <h3 className="db-section-header" style={{ fontSize: '17px', marginBottom: '16px' }}>Weekly Progress</h3>
            <div className="db-metrics-grid-2x2">
              <div className="db-metric-item">
                <span className="db-metric-value-large">{totalProblems}</span>
                <span className="db-metric-label-text">Problems Practised</span>
              </div>
              <div className="db-metric-item">
                <span className="db-metric-value-large">{completedProblems}</span>
                <span className="db-metric-label-text">Analyses Completed</span>
              </div>
              <div className="db-metric-item">
                <span className="db-metric-value-large" style={{ color: revisionDueCount > 0 ? '#B7791F' : 'inherit' }}>
                  {revisionDueCount}
                </span>
                <span className="db-metric-label-text">Revisions Due</span>
              </div>
              <div className="db-metric-item">
                <span className="db-metric-value-large">
                  {user?.learningPreferences?.dailyGoal || 3}
                </span>
                <span className="db-metric-label-text">Daily Goal</span>
              </div>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
};

export default DashboardPage;
export { DashboardPage };
