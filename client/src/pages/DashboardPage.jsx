import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getPracticeDashboard, getPracticeRecommendations, getAiUsage } from '../api/practice.api.js';
import { getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getMyProblems } from '../api/problem.api.js';
import FormError from '../components/common/FormError.jsx';
import { Target, Code, Code2, Calendar, TrendingUp, Clock, ListTodo, ArrowRight, Search, Link2, BookOpen, BarChart2, CheckCircle2, GitBranch, RefreshCw, Sparkles } from 'lucide-react';


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
        bg: '#F1F6F4', // Sage soft
        color: '#3D6053', // Sage text
        icon: <Link2 size={16} />
      };
    } else if (pat.includes('stack') || pat.includes('recursion') || pat.includes('tree') || pat.includes('graph') || pat.includes('parentheses')) {
      return {
        bg: '#F4F6F0', // Olive soft
        color: '#5B6B38', // Olive text
        icon: <Code size={16} />
      };
    } else if (pat.includes('search') || pat.includes('binary') || pat.includes('sliding') || pat.includes('window')) {
      return {
        bg: '#EAF5F0', // Emerald soft
        color: '#117452', // Emerald text
        icon: <Search size={16} />
      };
    } else {
      return {
        bg: '#EAF7F1', // Mint soft
        color: '#0D563D', // Mint text/forest
        icon: <Code size={16} />
      };
    }
  };

  return (
    <div className="db-redesign db-page-container">
      {error && (
        <div className="db-error-inline" style={{ display: 'flex', gap: '16px', padding: '16px 20px', borderRadius: '12px', backgroundColor: '#F1F6F4', border: '1px solid #D1DFDB', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
          <div style={{ flexGrow: 1 }}>
            <FormError message={error} />
          </div>
          <button className="db-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => fetchDashboardAndRecommendations(true)}>Retry</button>
        </div>
      )}

      {/* 1. TOP HERO / FOCUS AREA */}
      <section className="db-hero-section">
        {/* Left: copy + CTAs */}
        <div className="db-hero-left">
          <span className="db-eyebrow">
            <Sparkles size={12} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
            Your Learning Workspace
          </span>
          <h1 className="db-heading">Welcome back, {((user?.fullName || user?.username || 'Learner').charAt(0).toUpperCase() + (user?.fullName || user?.username || 'Learner').slice(1))}</h1>
          <p className="db-subheading">Analyse problems, revise concepts, track patterns, and build interview confidence—step by step.</p>
          <div className="db-header-actions">
            <Link to="/problems/new" className="db-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Code size={15} />
              <span>Analyze New Problem</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/problems" className="db-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={14} />
              <span>View My Analyses</span>
            </Link>
          </div>
        </div>

        {/* Middle: Custom Learning Illustration */}
        <div className="db-hero-deco">
          <svg className="db-hero-illustration" width="100%" height="100%" viewBox="0 0 380 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Card Shadow */}
              <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0d563d" floodOpacity="0.05" />
              </filter>

              {/* Laptop Mint Shadow */}
              <filter id="laptop-shadow" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#7fe0b7" floodOpacity="0.22" />
              </filter>

              {/* Card Gradients */}
              <linearGradient id="card-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f4faf6" />
              </linearGradient>

              {/* Chart Line Gradient */}
              <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#168b62" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#168b62" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Floating Cards (Background) */}
            {/* Progress Card */}
            <g className="db-ill-card-progress" filter="url(#card-shadow)">
              <rect x="25" y="20" width="115" height="85" rx="8" fill="url(#card-grad)" stroke="#d9e8df" strokeWidth="1" />
              <text x="35" y="38" fill="#0d563d" fontSize="10" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">Progress</text>

              {/* Grid lines */}
              <line x1="35" y1="52" x2="128" y2="52" stroke="#e6f0ea" strokeWidth="0.8" />
              <line x1="35" y1="64" x2="128" y2="64" stroke="#e6f0ea" strokeWidth="0.8" />
              <line x1="35" y1="76" x2="128" y2="76" stroke="#e6f0ea" strokeWidth="0.8" />

              {/* Shaded area */}
              <path d="M 35 88 L 35 84 C 55 86 65 72 80 74 C 95 76 105 60 115 50 C 122 45 128 40 128 32 L 128 88 Z" fill="url(#chart-grad)" />
              {/* Chart Line */}
              <path d="M 35 84 C 55 86 65 72 80 74 C 95 76 105 60 115 50 C 122 45 128 40 128 32" fill="none" stroke="#168b62" strokeWidth="1.8" strokeLinecap="round" />
              {/* End dot */}
              <circle cx="128" cy="32" r="2.5" fill="#168b62" />
            </g>

            {/* Patterns Mastered Card */}
            <g className="db-ill-card-patterns" filter="url(#card-shadow)">
              <rect x="240" y="35" width="115" height="85" rx="8" fill="url(#card-grad)" stroke="#d9e8df" strokeWidth="1" />
              <text x="250" y="53" fill="#0d563d" fontSize="9" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">Patterns Mastered</text>

              {/* Circular progress ring */}
              <circle cx="297" cy="92" r="18" fill="none" stroke="#eaf3ed" strokeWidth="3.5" />
              <text x="297" y="96" fill="#0d563d" fontSize="10" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">0%</text>
            </g>

            {/* Centered Laptop/Monitor */}
            <g className="db-ill-laptop" filter="url(#laptop-shadow)">
              {/* Screen Outer Bezel */}
              <rect x="105" y="65" width="170" height="110" rx="10" fill="#0d2c20" stroke="#0a2219" strokeWidth="1.5" />
              {/* Screen Inner Display */}
              <rect x="113" y="71" width="154" height="90" rx="4" fill="#0d4631" />
              {/* Screen Display Inner Edge */}
              <rect x="115" y="73" width="150" height="86" rx="3" fill="none" stroke="#165a41" strokeWidth="1" />

              {/* Screen Code Symbol </> */}
              <g className="db-ill-screen-code" transform="translate(190, 116)">
                {/* Left Angle Bracket */}
                <path d="M -18 -8 L -26 0 L -18 8" fill="none" stroke="#7fe0b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Right Angle Bracket */}
                <path d="M 18 -8 L 26 0 L 18 8" fill="none" stroke="#7fe0b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Slash */}
                <line x1="4" y1="-12" x2="-4" y2="12" stroke="#7fe0b7" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Keyboard Deck (Trapezoid) */}
              <path d="M 98 175 L 282 175 L 297 190 L 83 190 Z" fill="#0d2c20" />
              {/* Base Lip */}
              <path d="M 83 190 L 297 190 L 297 193 C 297 194.5 295.5 195 294 195 L 86 195 C 84.5 195 83 194.5 83 193 Z" fill="#091f16" />
              {/* Trackpad */}
              <rect x="175" y="177" width="30" height="6" rx="1.5" fill="#0a2319" />
            </g>

            {/* Stacked Books */}
            <g className="db-ill-books">
              {/* Bottom Book */}
              <path d="M 45 185 L 115 185 L 120 195 L 50 195 Z" fill="#117452" />
              <path d="M 50 195 L 120 195 L 118 198 L 52 198 Z" fill="#eaf5f0" />
              <path d="M 52 198 L 118 198 L 116 201 L 53 201 Z" fill="#0d563d" />
              <path d="M 45 185 C 48 185 53 190 53 201 L 50 201 C 50 190 45 185 45 185 Z" fill="#0a3e2c" />

              {/* Top Book */}
              <path d="M 52 172 L 110 172 L 114 182 L 56 182 Z" fill="#7fe0b7" />
              <path d="M 56 182 L 114 182 L 112 185 L 58 185 Z" fill="#ffffff" />
              <path d="M 58 185 L 112 185 L 110 188 L 59 188 Z" fill="#59cfa1" />
              <path d="M 52 172 C 54 172 58 176 58 188 L 56 188 C 56 176 52 172 52 172 Z" fill="#3eb889" />

              {/* Spine lines */}
              <line x1="55" y1="176" x2="57" y2="176" stroke="#ffffff" strokeWidth="1" />
              <line x1="55" y1="180" x2="57" y2="180" stroke="#ffffff" strokeWidth="1" />

              {/* Standing Book */}
              <g className="db-ill-book-standing">
                <rect x="62" y="130" width="18" height="42" rx="2" fill="#168b62" />
                <rect x="65" y="133" width="12" height="36" rx="1" fill="#0d563d" />
                {/* Tiny code symbol inside spine */}
                <path d="M 69 149 L 67 151 L 69 153" fill="none" stroke="#7fe0b7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 73 149 L 75 151 L 73 153" fill="none" stroke="#7fe0b7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="72" y1="148" x2="70" y2="154" stroke="#7fe0b7" strokeWidth="1" />
              </g>
            </g>

            {/* Coding Cup */}
            <g className="db-ill-cup">
              {/* Cup Shadow */}
              <ellipse cx="245" cy="211" rx="12" ry="2" fill="#0d563d" fillOpacity="0.12" />
              {/* Cup Body */}
              <path d="M 235 180 L 255 180 L 251 210 C 251 212 249 213 247 213 L 243 213 C 241 213 239 212 239 210 Z" fill="#ffffff" stroke="#d9e8df" strokeWidth="0.8" />
              {/* Cup Band */}
              <path d="M 236 186 L 254 186 L 252 198 L 238 198 Z" fill="#117452" />
              {/* Cup Lid */}
              <path d="M 233 176 C 233 174 235 174 238 174 L 252 174 C 255 174 257 174 257 176 L 257 180 L 233 180 Z" fill="#0d2c20" />
              {/* Band Code Symbol */}
              <g transform="translate(245, 192)">
                <path d="M -3 -2.5 L -5 0 L -3 2.5" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 3 -2.5 L 5 0 L 3 2.5" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="1.5" y1="-3" x2="-1.5" y2="3" stroke="#ffffff" strokeWidth="1" />
              </g>
            </g>

            {/* Plant */}
            <g className="db-ill-plant">
              {/* Pot Shadow */}
              <ellipse cx="296" cy="201" rx="14" ry="2" fill="#0d563d" fillOpacity="0.1" />
              {/* Pot */}
              <path d="M 285 178 L 307 178 L 304 198 C 304 200 302 201 300 201 L 292 201 C 290 201 288 200 288 198 Z" fill="#f5faf7" stroke="#d9e8df" strokeWidth="0.8" />
              {/* Rim */}
              <rect x="283" y="175" width="26" height="3" rx="1.5" fill="#d9e8df" />
              {/* Soil */}
              <ellipse cx="295" cy="177" rx="10" ry="1.5" fill="#5c4033" />
              {/* Leaves */}
              <path d="M 295 177 Q 282 165 279 150 Q 291 154 295 177 Z" fill="#5b6b38" />
              <path d="M 295 177 Q 291 155 292 135 Q 300 147 295 177 Z" fill="#168b62" />
              <path d="M 295 177 Q 299 155 305 140 Q 306 155 295 177 Z" fill="#8e9f8e" />
              <path d="M 295 177 Q 307 170 314 158 Q 309 166 295 177 Z" fill="#5b6b38" />
            </g>
          </svg>
        </div>

        {/* Right: Today's Focus */}
        <div className="db-hero-right">
          <div className="db-focus-panel">
            <div className="db-focus-header">
              <div className="db-focus-header-left">
                <Target size={15} className="db-focus-header-icon" />
                <h3>Today's Focus</h3>
              </div>
            </div>
            <div className="db-focus-body">
              <div className="db-focus-row">
                <div className="db-focus-row-label">
                  <div className="db-focus-row-icon-box">
                    <ListTodo size={13} />
                  </div>
                  <div className="db-focus-row-text">
                    <span className="db-focus-row-name">Problems Planned</span>
                    <span className="db-focus-row-sub">Target for focused practice</span>
                  </div>
                </div>
                <span className="db-focus-row-value">{revisionDueCount}</span>
              </div>
              <div className="db-focus-row">
                <div className="db-focus-row-label">
                  <div className="db-focus-row-icon-box">
                    <Clock size={13} />
                  </div>
                  <div className="db-focus-row-text">
                    <span className="db-focus-row-name">Est. Time</span>
                    <span className="db-focus-row-sub">Time to complete</span>
                  </div>
                </div>
                <span className="db-focus-row-value">
                  {revisionDueCount > 0 ? `${revisionDueCount * 30} min` : '0 min'}
                </span>
              </div>
              <div className="db-focus-row">
                <div className="db-focus-row-label">
                  <div className="db-focus-row-icon-box">
                    <TrendingUp size={13} />
                  </div>
                  <div className="db-focus-row-text">
                    <span className="db-focus-row-name">Confidence Goal</span>
                    <span className="db-focus-row-sub">Aim to improve today</span>
                  </div>
                </div>
                <span className="db-focus-row-value db-focus-goal">
                  {topWeakPatterns.length > 0 ? 'Improve' : 'Not set'}
                </span>
              </div>
            </div>
            <div className="db-focus-motivator">
              <span>Small steps today, big progress tomorrow. You've got this 🌱</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SUMMARY METRICS GRID */}
      <section className="db-metrics-grid">
        <div className="db-metric-card">
          <div className="db-metric-icon-box" style={{ backgroundColor: '#EAF7F1', color: '#0D563D' }}>
            <BookOpen size={16} />
          </div>
          <div className="db-metric-body">
            <span className="db-metric-label">Problems Studied</span>
            <span className="db-metric-value">{totalProblems}</span>
            <span className="db-metric-desc">Total problems saved</span>
          </div>
          <svg className="db-metric-wave" viewBox="0 0 120 28" preserveAspectRatio="none">
            <path d="M0 20 Q20 8 40 16 Q60 24 80 12 Q100 2 120 14 L120 28 L0 28Z" fill="#C6EAD8" opacity="0.45" />
          </svg>
        </div>
        <div className="db-metric-card">
          <div className="db-metric-icon-box" style={{ backgroundColor: '#F1F6F4', color: '#3D6053' }}>
            <CheckCircle2 size={16} />
          </div>
          <div className="db-metric-body">
            <span className="db-metric-label">Revisions Completed</span>
            <span className="db-metric-value">{completedProblems}</span>
            <span className="db-metric-desc">Recall practices completed</span>
          </div>
          <svg className="db-metric-wave" viewBox="0 0 120 28" preserveAspectRatio="none">
            <path d="M0 18 Q30 6 60 18 Q90 28 120 12 L120 28 L0 28Z" fill="#D1DFDB" opacity="0.45" />
          </svg>
        </div>
        <div className="db-metric-card">
          <div className="db-metric-icon-box" style={{ backgroundColor: '#F4F6F0', color: '#5B6B38' }}>
            <Calendar size={16} />
          </div>
          <div className="db-metric-body">
            <span className="db-metric-label">Revisions Due</span>
            <span className="db-metric-value">{revisionDueCount}</span>
            <span className="db-metric-desc">Due for spaced recall today</span>
          </div>
          <svg className="db-metric-wave" viewBox="0 0 120 28" preserveAspectRatio="none">
            <path d="M0 16 Q25 28 50 16 Q75 4 100 18 Q110 22 120 16 L120 28 L0 28Z" fill="#D4DBC7" opacity="0.45" />
          </svg>
        </div>
        <div className="db-metric-card">
          <div className="db-metric-icon-box" style={{ backgroundColor: '#F0F3F1', color: '#5A6B64' }}>
            <BarChart2 size={16} />
          </div>
          <div className="db-metric-body">
            <span className="db-metric-label">AI Analyses</span>
            <span className="db-metric-value">{usageData?.analysisRequests || 0}</span>
            <span className="db-metric-desc">AI mentorship runs executed</span>
          </div>
          <svg className="db-metric-wave" viewBox="0 0 120 28" preserveAspectRatio="none">
            <path d="M0 22 Q30 10 60 20 Q90 28 120 14 L120 28 L0 28Z" fill="#DEE3E1" opacity="0.45" />
          </svg>
        </div>
      </section>

      <div className="db-divider-main"></div>

      <div className="db-main-layout">
        <div className="db-col-main">
          {/* 3. CURRENT LEARNING */}
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
                      {continueProblem.language && (
                        <span className="db-badge" style={{ backgroundColor: '#F0F3F1', color: '#5A6B64', border: '1px solid #DEE3E1' }}>
                          {continueProblem.language === 'cpp' ? 'C++' : continueProblem.language === 'java' ? 'Java' : continueProblem.language === 'python' ? 'Python' : continueProblem.language === 'javascript' ? 'JavaScript' : continueProblem.language}
                        </span>
                      )}
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
              <div className="db-empty-state-compact" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', border: '1px dashed #D1DFDB', borderRadius: '12px', backgroundColor: '#F1F6F4' }}>
                <Code size={20} style={{ color: '#3D6053', flexShrink: 0 }} />
                <div className="db-empty-text-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1 }}>
                  <p className="db-empty-title" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>No active problem yet</p>
                  <p className="db-empty-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select a problem to start understanding and optimizing your code.</p>
                </div>
                <Link to="/problems/new" className="db-btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Learn a Problem</Link>
              </div>
            )}
          </section>

          <div className="db-divider-sub"></div>

          {/* 4. RECOMMENDED NEXT */}
          <section className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title">Recommended Next</h2>
              <p className="db-section-subtitle">Practice chosen from your weak areas and recent attempts.</p>
            </div>
            {allRecs.length === 0 ? (
              <div className="db-empty-state-compact" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', border: '1px dashed #D1DFDB', borderRadius: '12px', backgroundColor: '#F1F6F4' }}>
                <Search size={20} style={{ color: '#3D6053', flexShrink: 0 }} />
                <div className="db-empty-text-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1 }}>
                  <p className="db-empty-title" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>No recommendations yet</p>
                  <p className="db-empty-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Complete your first analysis so AlgoMentor can personalize practice problems for you.</p>
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
          {/* 5. REVISE TODAY */}
          <section className="db-section">
            <div className="db-section-header">
              <div className="db-section-title-with-icon">
                <Calendar size={18} className="db-warning-icon" />
                <h2 className="db-section-title">Revise Today</h2>
              </div>
              <p className="db-section-subtitle">Problems due for recall before the solution fades.</p>
            </div>
            {reviseToday.length === 0 ? (
              <div className="db-revise-empty-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #D1DFDB', borderRadius: '12px', backgroundColor: '#F1F6F4' }}>
                <div className="db-revise-empty-icon-box" style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#EAF7F1', color: '#168B62', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={18} />
                </div>
                <div className="db-revise-empty-text" style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Nothing is due today</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Your next scheduled spaced repetition revision will appear here.</p>
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

          {/* 6. WEAK PATTERNS */}
          <section className="db-section">
            <div className="db-section-header">
              <div className="db-section-title-with-icon">
                <TrendingUp size={18} className="db-ai-icon" />
                <h2 className="db-section-title">Weak Patterns</h2>
              </div>
              <p className="db-section-subtitle">Patterns that need more deliberate practice.</p>
            </div>
            {topWeakPatterns.length === 0 ? (
              <div className="db-revise-empty-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #D1DFDB', borderRadius: '12px', backgroundColor: '#F1F6F4' }}>
                <div className="db-revise-empty-icon-box" style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#F4F6F0', color: '#5B6B38', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={18} />
                </div>
                <div className="db-revise-empty-text" style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>No weak patterns yet</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Weak patterns will be identified once you submit analyses for a few problems.</p>
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
                        role="progressbar"
                        aria-valuenow={Math.round(pat.confidenceScore)}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-label={`Confidence score of ${Math.round(pat.confidenceScore)}% for ${pat.pattern}`}
                        style={{
                          width: `${Math.round(pat.confidenceScore)}%`,
                          backgroundColor: idx === 0 ? '#5B6B38' : idx === 1 ? '#8E9F8E' : idx === 2 ? '#168B62' : '#0D563D'
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

          {/* 7. THIS WEEK */}
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
