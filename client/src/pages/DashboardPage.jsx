import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getPracticeDashboard, getPracticeRecommendations, getAiUsage } from '../api/practice.api.js';
import { getLatestProblemAnalysis } from '../api/analysis.api.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { PlusCircle, Bookmark, BookOpen, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [recommendationData, setRecommendationData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLoadings, setOpenLoadings] = useState({});

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : (user?.username || 'Student');

  useEffect(() => {
    const fetchDashboardAndRecommendations = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [dash, recs, usage] = await Promise.all([
          getPracticeDashboard(),
          getPracticeRecommendations(),
          getAiUsage().catch((e) => {
            console.error('Failed to load usage limits:', e);
            return null;
          }),
        ]);
        setDashboardData(dash);
        setRecommendationData(recs);
        setUsageData(usage);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Could not retrieve practice data. Please refresh or retry.');
      } finally {
        setIsLoading(false);
      }
    };
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

  // Formulate welcoming alert banner next steps
  let welcomeNextAction = 'Ready to analyze another problem statement?';
  if (revisionDueCount > 0) {
    welcomeNextAction = `You have ${revisionDueCount} spaced-revision items overdue today. Try to review them.`;
  } else if (topWeakPatterns.length > 0 && topWeakPatterns[0].confidenceScore < 50) {
    welcomeNextAction = `Strengthen your weak pattern: "${topWeakPatterns[0].pattern}" (Confidence: ${Math.round(topWeakPatterns[0].confidenceScore)}%).`;
  }

  const getWeaknessSignal = (pat) => {
    if (pat.bruteForceDependenceCount > 0) return 'Brute force dependence';
    if (pat.missedEdgeCaseCount > 0) return 'Repeated missed edge cases';
    if (pat.codeIssueCount > 0) return 'Code logic bugs';
    return 'Needs general practice';
  };

  return (
    <div className="dashboard-page-container container" style={{ paddingBottom: '80px' }}>
      {/* Top Welcome Banner */}
      <header className="dashboard-welcome" style={{ marginBottom: '24px' }}>
        <h1 className="welcome-title">Welcome back, {firstName}</h1>
        <p className="welcome-subtitle" style={{ color: 'var(--text-secondary)' }}>{welcomeNextAction}</p>
      </header>

      {/* Progress Overview Grid (PART K Requirement) */}
      <section className="dashboard-grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="preview-card-item" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Saved Problems</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px' }}>{totalProblems}</h2>
        </div>
        <div className="preview-card-item" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Completed Reports</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px' }}>{completedProblems}</h2>
        </div>
        <div className="preview-card-item" style={{ padding: '16px', borderLeft: revisionDueCount > 0 ? '4px solid var(--warning)' : '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Revision Due</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: revisionDueCount > 0 ? 'var(--warning)' : 'inherit' }}>{revisionDueCount}</h2>
        </div>
        <div className="preview-card-item" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Mastered Patterns</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: 'var(--success)' }}>{masteredCount}</h2>
        </div>
      </section>

      {error && <FormError message={error} />}

      <div className="dashboard-workspace-columns-layout" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '32px' }}>
        
        {/* Left Column: Revision and Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Revise Today Panel */}
          <section className="dashboard-card-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0' }}>Revise Today</h3>
              {revisionDueCount > 0 && (
                <Link to="/revise" className="clear-text-btn" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)' }}>
                  View All ({revisionDueCount})
                </Link>
              )}
            </div>

            {reviseToday.length === 0 ? (
              <div className="empty-state-container" style={{ padding: '24px' }}>
                <p className="empty-state-description" style={{ fontSize: '13px', margin: '0' }}>
                  No revision tasks due for today. Keep up the solid practice!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviseToday.map((problem) => (
                  <div key={problem._id} className="preview-card-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{problem.title}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                        <span>Topic: {problem.topics?.join(', ') || 'General'}</span>
                        <span>Confidence: <strong>{problem.confidence}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenProblem(problem)}
                      disabled={openLoadings[problem._id]}
                      className="btn btn-secondary btn-sm"
                    >
                      {openLoadings[problem._id] ? 'Opening...' : 'Open'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recommended Next Problems */}
          <section className="dashboard-card-panel">
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Recommended Next Problems</h3>

            {/* Strengthen Weak Patterns */}
            {weakPatternPractice.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '12.5px', textTransform: 'uppercase', color: 'var(--ai-accent)', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} />
                  <span>Strengthen Weak Patterns</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {weakPatternPractice.map((rec, idx) => (
                    <div key={idx} className="preview-card-item" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '14px' }}>{rec.title}</strong>
                          <span style={{ fontSize: '11px', backgroundColor: 'var(--bg-soft)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', textTransform: 'capitalize' }}>
                            {rec.difficulty}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate('/problems/new', { state: { recommendedTitle: rec.title, topic: rec.topic, pattern: rec.pattern, focus: rec.focus } })}
                          className="btn btn-primary btn-sm"
                        >
                          Start
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>{rec.reason}</p>
                      <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px' }}>Focus: {rec.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important Interview Patterns */}
            {importantInterviewPatterns.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '12.5px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '700', marginBottom: '10px' }}>
                  Important Interview Patterns
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {importantInterviewPatterns.map((rec, idx) => (
                    <div key={idx} className="preview-card-item" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '14px' }}>{rec.title}</strong>
                          <span style={{ fontSize: '11px', backgroundColor: 'var(--bg-soft)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', textTransform: 'capitalize' }}>
                            {rec.difficulty}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate('/problems/new', { state: { recommendedTitle: rec.title, topic: rec.topic, pattern: rec.pattern, focus: rec.focus } })}
                          className="btn btn-primary btn-sm"
                        >
                          Start
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>{rec.reason}</p>
                      <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px' }}>Focus: {rec.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Difficulty Step */}
            {nextDifficultyStep.length > 0 && (
              <div>
                <h4 style={{ fontSize: '12.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '10px' }}>
                  Next Difficulty Step
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {nextDifficultyStep.map((rec, idx) => (
                    <div key={idx} className="preview-card-item" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '14px' }}>{rec.title}</strong>
                          <span style={{ fontSize: '11px', backgroundColor: 'var(--bg-soft)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', textTransform: 'capitalize' }}>
                            {rec.difficulty}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate('/problems/new', { state: { recommendedTitle: rec.title, topic: rec.topic, pattern: rec.pattern, focus: rec.focus } })}
                          className="btn btn-primary btn-sm"
                        >
                          Start
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>{rec.reason}</p>
                      <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px' }}>Focus: {rec.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>

        {/* Right Column: Weak Patterns and Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Analyze CTA Box */}
          <section className="primary-workspace-card" style={{ margin: '0', padding: '24px' }}>
            <h2 className="workspace-card-title" style={{ fontSize: '16px' }}>Analyse a problem</h2>
            <p className="workspace-card-desc" style={{ fontSize: '12.5px', marginBottom: '16px' }}>
              Paste a custom DSA question to unlock progressive hints, edge cases, and code solutions.
            </p>
            <Link to="/problems/new" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={14} />
              <span>Analyse now</span>
            </Link>
          </section>

          {/* AI Usage Limits */}
          {usageData && (
            <section className="dashboard-card-panel">
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Daily AI Usage</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Analyses used today:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{usageData.analysisRequests} / {usageData.limits?.analysisRequests}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Follow-ups used today:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{usageData.followUpRequests} / {usageData.limits?.followUpRequests}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Remaining analyses:</span>
                  <strong style={{ color: usageData.remaining?.analysisRequests === 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {usageData.remaining?.analysisRequests}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {/* Weak Patterns List */}
          <section className="dashboard-card-panel">
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Weak Patterns</h3>

            {topWeakPatterns.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0' }}>
                No practice data yet. Complete an analysis to see weak patterns.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {topWeakPatterns.map((pat, idx) => (
                  <div key={idx} className="preview-card-item" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {pat.pattern}
                      </strong>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger)' }}>
                        {Math.round(pat.confidenceScore)}% Score
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Main Signal: <strong>{getWeaknessSignal(pat)}</strong>
                    </span>
                    <button
                      onClick={() => navigate('/problems/new', { state: { topic: pat.topic, pattern: pat.pattern } })}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '4px', alignSelf: 'flex-start', padding: '4px 10px', fontSize: '11px', height: '24px' }}
                    >
                      Practise
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
export { DashboardPage };
