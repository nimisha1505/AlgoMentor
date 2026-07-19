import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { FileText, Target, Lightbulb, Brain, ScanSearch, Trophy, Code2, BookOpenCheck, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const handleAnchorClick = (e, targetId) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page-container">
      {/* BACKGROUND DECORATIVE SHAPES */}
      <div className="hero-background-shape">
        <svg viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-bg-svg">
          <path d="M-100 200 C150 100, 300 400, 900 150" stroke="#10B981" strokeWidth="1" strokeOpacity="0.08" />
          <path d="M-50 250 C200 150, 350 450, 950 200" stroke="#86EFAC" strokeWidth="1" strokeOpacity="0.05" />
          <circle cx="150" cy="150" r="100" stroke="#10B981" strokeWidth="1" strokeOpacity="0.04" />
        </svg>
      </div>

      {/* 1. HERO SECTION */}
      <section className="public-section home-hero-section">
        <div className="site-container">
          <div className="hero-left">
            <span className="hero-eyebrow">Your Personal DSA Learning Workspace</span>
            <h1 className="hero-headline">
              Understand DSA Problems Before You Memorize Solutions
            </h1>
            <p className="hero-subtext">
              Break down problem statements, discover patterns, compare approaches, review code, and revise weak topics—all in one guided workspace.
            </p>
            <div className="hero-actions">
              <Link
                to={isAuthenticated ? '/problems/new' : '/register'}
                className="btn btn-primary btn-hero-primary"
              >
                Analyze a Problem
              </Link>
              <Link
                to={isAuthenticated ? '/problems' : '/login'}
                className="btn-text-action btn-hero-secondary"
              >
                View My Analyses
              </Link>
            </div>
            
            {/* COMPACT CAPABILITY ROW */}
            <div className="hero-capabilities-row">
              <span className="cap-item"><FileText size={13} className="cap-icon" /> Understand</span>
              <span className="cap-separator">•</span>
              <span className="cap-item"><Trophy size={13} className="cap-icon" /> Compare</span>
              <span className="cap-separator">•</span>
              <span className="cap-item"><Target size={13} className="cap-icon" /> Practice</span>
              <span className="cap-separator">•</span>
              <span className="cap-item"><BookOpenCheck size={13} className="cap-icon" /> Revise</span>
            </div>

            <p className="hero-trust-line">
              Built for engineers who want to build intuition, track confidence, and master patterns.
            </p>
          </div>

          <div className="hero-right">
            <div className="workspace-preview-illustration">
              <svg viewBox="0 0 540 440" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-svg-illustration">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#EEF2F1" strokeWidth="1" />
                  </pattern>
                  <radialGradient id="mint-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#FAFBFB" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#mint-glow)" />
                <rect width="100%" height="100%" fill="url(#grid)" rx="16" />

                {/* Glow behind central editor */}
                <circle cx="270" cy="220" r="120" fill="#A7F3D0" opacity="0.3" filter="blur(30px)" />

                {/* Connector lines from cards to the main editor */}
                <path d="M 145 58 C 170 58, 170 120, 200 120" stroke="#86EFAC" strokeWidth="1.5" strokeDasharray="4 4" className="illus-dash-line" />
                <path d="M 395 58 C 370 58, 370 120, 340 120" stroke="#86EFAC" strokeWidth="1.5" strokeDasharray="4 4" className="illus-dash-line" />
                <path d="M 150 371 C 170 371, 170 320, 200 320" stroke="#86EFAC" strokeWidth="1.5" strokeDasharray="4 4" className="illus-dash-line" />
                <path d="M 385 371 C 370 371, 370 320, 340 320" stroke="#86EFAC" strokeWidth="1.5" strokeDasharray="4 4" className="illus-dash-line" />

                {/* Central Workspace Card */}
                <g className="illus-card central-workspace" transform="translate(140, 100)">
                  <rect width="260" height="200" rx="12" fill="#FFFFFF" stroke="#168B62" strokeWidth="2" />
                  {/* Header of Editor */}
                  <rect width="260" height="32" rx="12" fill="#EEF9F4" />
                  <circle cx="15" cy="16" r="4" fill="#168B62" opacity="0.6" />
                  <circle cx="27" cy="16" r="4" fill="#168B62" opacity="0.6" />
                  <circle cx="39" cy="16" r="4" fill="#168B62" opacity="0.6" />
                  <text x="60" y="20" fill="#117452" fontSize="10" fontWeight="bold" fontFamily="monospace">two_sum.py</text>

                  {/* Inside Editor code lines */}
                  <text x="16" y="58" fill="#17212B" fontSize="9.5" fontFamily="monospace" letterSpacing="0">
                    <tspan x="16" dy="0" fill="#117452" fontWeight="bold">def</tspan>
                    <tspan fill="#17212B"> twoSum(nums, target):</tspan>
                    <tspan x="30" dy="16" fill="#168B62">seen = &#123;&#125;</tspan>
                    <tspan x="30" dy="16" fill="#117452" fontWeight="bold">for</tspan>
                    <tspan fill="#17212B"> i, num </tspan>
                    <tspan fill="#117452" fontWeight="bold">in</tspan>
                    <tspan fill="#17212B"> enumerate(nums):</tspan>
                    <tspan x="44" dy="16" fill="#168B62">diff = target - num</tspan>
                    <tspan x="44" dy="16" fill="#117452" fontWeight="bold">if</tspan>
                    <tspan fill="#17212B"> diff </tspan>
                    <tspan fill="#117452" fontWeight="bold">in</tspan>
                    <tspan fill="#17212B"> seen:</tspan>
                    <tspan x="58" dy="16" fill="#117452" fontWeight="bold">return</tspan>
                    <tspan fill="#17212B"> [seen[diff], i]</tspan>
                  </text>
                </g>

                {/* Connected Card 1: Pattern (Top-Left) */}
                <g className="illus-card card-pattern" transform="translate(15, 35)">
                  <rect width="130" height="46" rx="8" fill="#EEF9F4" stroke="#86EFAC" strokeWidth="1" />
                  <text x="12" y="18" fill="#5F7D70" fontSize="8" fontWeight="bold" letterSpacing="0.5">01 / PATTERN</text>
                  <text x="12" y="32" fill="#0E2A1F" fontSize="11" fontWeight="bold">Hash Map Lookup</text>
                </g>

                {/* Connected Card 2: Hint (Top-Right) */}
                <g className="illus-card card-hint" transform="translate(390, 35)">
                  <rect width="130" height="46" rx="8" fill="#FFFFFF" stroke="#E2E9E6" strokeWidth="1" />
                  <text x="12" y="18" fill="#5F7D70" fontSize="8" fontWeight="bold" letterSpacing="0.5">02 / PROGRESSIVE HINT</text>
                  <text x="12" y="32" fill="#17212B" fontSize="10">Track visited value...</text>
                </g>

                {/* Connected Card 3: Dry Run (Bottom-Left) */}
                <g className="illus-card card-dryrun" transform="translate(10, 345)">
                  <rect width="140" height="52" rx="8" fill="#FFFFFF" stroke="#E2E9E6" strokeWidth="1" />
                  <text x="12" y="16" fill="#5F7D70" fontSize="8" fontWeight="bold" letterSpacing="0.5">03 / DRY RUN STEP</text>
                  <text x="12" y="28" fill="#17212B" fontSize="9" fontFamily="monospace">nums=[2, 7], target=9</text>
                  <text x="12" y="40" fill="#168B62" fontSize="9" fontFamily="monospace" fontWeight="bold">{"seen={2:0} -> [0,1]"}</text>
                </g>

                {/* Connected Card 4: Approach (Bottom-Right) */}
                <g className="illus-card card-approach" transform="translate(385, 345)">
                  <rect width="140" height="52" rx="8" fill="#EEF9F4" stroke="#168B62" strokeWidth="1.5" />
                  <text x="12" y="16" fill="#168B62" fontSize="8" fontWeight="bold" letterSpacing="0.5">04 / OPTIMAL APPROACH</text>
                  <text x="12" y="28" fill="#0E2A1F" fontSize="10" fontWeight="bold">Time: O(N) | Space: O(N)</text>
                  <text x="12" y="40" fill="#51625A" fontSize="9">Single-pass algorithm</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT FLOW */}
      <section id="how-it-works" className="public-section--compact home-flow-section">
        <div className="site-container">
          <div className="section-heading">
            <span className="section-eyebrow">How it works</span>
            <h2 className="section-title">One workspace. Three steps to mastery.</h2>
          </div>

          <div className="flow-steps">
            <div className="flow-card">
              <div className="flow-badge">1</div>
              <div className="flow-icon-wrapper">
                <FileText className="flow-icon" size={24} />
              </div>
              <span className="flow-number">Step 01</span>
              <h3 className="flow-card-title">Paste a Problem</h3>
              <p className="flow-card-text">
                Provide a LeetCode URL, description, or custom DSA question to begin your learning session.
              </p>
            </div>

            <div className="flow-connector">
              <ArrowRight size={24} className="flow-connector-arrow" />
            </div>

            <div className="flow-card">
              <div className="flow-badge">2</div>
              <div className="flow-icon-wrapper">
                <Target className="flow-icon" size={24} />
              </div>
              <span className="flow-number">Step 02</span>
              <h3 className="flow-card-title">Choose Your Depth</h3>
              <p className="flow-card-text">
                Pick from modes like Quick Explanations, Hints, full Brute-to-Optimal builds, or Code Review.
              </p>
            </div>

            <div className="flow-connector">
              <ArrowRight size={24} className="flow-connector-arrow" />
            </div>

            <div className="flow-card">
              <div className="flow-badge">3</div>
              <div className="flow-icon-wrapper">
                <Sparkles className="flow-icon" size={24} />
              </div>
              <span className="flow-number">Step 03</span>
              <h3 className="flow-card-title">Learn Step by Step</h3>
              <p className="flow-card-text">
                Interactive analysis breaks down pattern recognition, progressive hints, and complexity step-by-step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE LEARNING FEATURES */}
      <section id="features" className="public-section home-features-section">
        <div className="site-container">
          <div className="section-heading">
            <span className="section-eyebrow">Core Features</span>
            <h2 className="section-title">Core Learning Workspace Features</h2>
            <p className="section-subtitle">
              We help you decompose, solve, verify, and revise questions rather than serving code on a platter.
            </p>
          </div>

          <div className="features-grid">
            {/* FEATURED CARD 1 */}
            <div className="feature-card featured">
              <div className="featured-badge">Featured</div>
              <Lightbulb className="feature-icon" size={24} />
              <h3 className="feature-title">Progressive Learning</h3>
              <p className="feature-desc">
                Identify core patterns and unlock hints step-by-step to build problem-solving intuition without spoilers.
              </p>
            </div>

            {/* NORMAL CARD 1: PATTERN IDENTIFICATION */}
            <div className="feature-card">
              <Brain className="feature-icon" size={20} />
              <h3 className="feature-title">Pattern Identification</h3>
              <p className="feature-desc">Discover core patterns like sliding window, two pointers, or backtracking.</p>
            </div>

            {/* FEATURED CARD 2 */}
            <div className="feature-card featured">
              <div className="featured-badge">Featured</div>
              <Code2 className="feature-icon" size={24} />
              <h3 className="feature-title">Brute-to-Optimal Approaches</h3>
              <p className="feature-desc">
                Examine multiple approach strategies and trade-offs side by side, building from simple brute-force to optimally engineered code.
              </p>
            </div>

            {/* NORMAL CARD 2: CODE REVIEW */}
            <div className="feature-card">
              <CheckCircle2 className="feature-icon" size={20} />
              <h3 className="feature-title">Code Review</h3>
              <p className="feature-desc">Evaluate your code logic against hidden traps, complexity bounds, and anti-patterns.</p>
            </div>

            {/* COMPACT CARD 1 */}
            <div className="feature-card">
              <FileText className="feature-icon" size={20} />
              <h3 className="feature-title">Simplified problem explanation</h3>
              <p className="feature-desc">Breaks down complex problem statements into plain English.</p>
            </div>

            {/* COMPACT CARD 2 */}
            <div className="feature-card">
              <Target className="feature-icon" size={20} />
              <h3 className="feature-title">Input/output and constraints</h3>
              <p className="feature-desc">Understand constraints and their implications on algorithm choice.</p>
            </div>

            {/* COMPACT CARD 3 */}
            <div className="feature-card">
              <Trophy className="feature-icon" size={20} />
              <h3 className="feature-title">Time and space complexity</h3>
              <p className="feature-desc">Establish absolute performance boundaries with Big-O notation.</p>
            </div>

            {/* COMPACT CARD 4 */}
            <div className="feature-card">
              <ScanSearch className="feature-icon" size={20} />
              <h3 className="feature-title">Dry runs and edge cases</h3>
              <p className="feature-desc">Walk through optimal logic execution against tricky test inputs.</p>
            </div>

            {/* COMPACT CARD 5 */}
            <div className="feature-card">
              <BookOpenCheck className="feature-icon" size={20} />
              <h3 className="feature-title">Personalized revision</h3>
              <p className="feature-desc">Save, track, and reinforce concepts with confidence-based spaced repetition.</p>
            </div>

            {/* COMPACT CARD 6 */}
            <div className="feature-card">
              <Sparkles className="feature-icon" size={20} />
              <h3 className="feature-title">Interview-ready explanations</h3>
              <p className="feature-desc">Learn how to articulate patterns and complexity trade-offs during a live interview.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SIGNATURE PRODUCT PREVIEW SECTION */}
      <section className="public-section home-preview-section">
        <div className="site-container">
          <div className="section-heading">
            <span className="section-eyebrow">Interactive Demo</span>
            <h2 className="section-title">See How One Problem Becomes a Complete Learning Session</h2>
            <p className="section-subtitle">
              AlgoMentor decomposes a single problem statement into an entire curriculum built dynamically around your logic gaps.
            </p>
          </div>

          <div className="workspace-preview-grid">
            {/* Main Panel: The Workspace Editor */}
            <div className="workspace-main-panel">
              <div className="workspace-panel-header">
                <div className="panel-tab active">
                  <Code2 size={14} className="panel-tab-icon" />
                  <span>workspace_active.py</span>
                </div>
                <div className="panel-tab">
                  <FileText size={14} className="panel-tab-icon" />
                  <span>problem_description.md</span>
                </div>
              </div>
              <div className="workspace-panel-body">
                <div className="code-editor-mock">
                  <div className="line-numbers">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                    <span>6</span>
                    <span>7</span>
                    <span>8</span>
                    <span>9</span>
                  </div>
                  <pre className="code-content">
<code><span className="keyword">def</span> <span className="function">findOptimalPair</span>(nums, target):
    <span className="comment"># Single-pass lookup strategy</span>
    seen = {}
    <span className="keyword">for</span> idx, val <span className="keyword">in</span> <span className="function">enumerate</span>(nums):
        complement = target - val
        <span className="keyword">if</span> complement <span className="keyword">in</span> seen:
            <span className="keyword">return</span> [seen[complement], idx]
        seen[val] = idx
    <span className="keyword">return</span> []</code>
                  </pre>
                </div>
                <div className="workspace-editor-footer">
                  <span className="footer-status">● Ready for analysis</span>
                  <span className="footer-language">Python 3.10</span>
                </div>
              </div>
            </div>

            {/* Supporting Panel 1: Pattern Identification */}
            <div className="workspace-sub-panel panel-pattern">
              <h4 className="sub-panel-title">
                <Brain size={14} className="sub-panel-icon" />
                <span>Pattern Identified</span>
              </h4>
              <div className="sub-panel-content">
                <span className="pattern-badge">Hash Map Matcher</span>
                <p className="pattern-text">
                  Recognized array search. Complements can be looked up in O(1) time using a hash map structure.
                </p>
              </div>
            </div>

            {/* Supporting Panel 2: Progressive Hints */}
            <div className="workspace-sub-panel panel-hints">
              <h4 className="sub-panel-title">
                <Lightbulb size={14} className="sub-panel-icon" />
                <span>Progressive Hint</span>
              </h4>
              <div className="sub-panel-content">
                <div className="hint-step active">
                  <span className="step-num">Hint 1</span>
                  <p className="step-desc">Instead of scanning the left array for each number, can we store what we have seen?</p>
                </div>
                <div className="hint-step locked">
                  <span className="step-num">Hint 2 (Locked)</span>
                  <p className="step-desc">Consider storing number-to-index pairs as key-values.</p>
                </div>
              </div>
            </div>

            {/* Supporting Panel 3: Approach Comparison */}
            <div className="workspace-sub-panel panel-comparison">
              <h4 className="sub-panel-title">
                <Trophy size={14} className="sub-panel-icon" />
                <span>Approach Trade-Offs</span>
              </h4>
              <div className="sub-panel-content">
                <div className="comp-row-header">
                  <span>Approach</span>
                  <span>Time</span>
                  <span>Space</span>
                </div>
                <div className="comp-row-item">
                  <span className="comp-name">Brute Force</span>
                  <span className="comp-time">O(N²)</span>
                  <span className="comp-space">O(1)</span>
                </div>
                <div className="comp-row-item highlighted">
                  <span className="comp-name">Hash Map</span>
                  <span className="comp-time">O(N)</span>
                  <span className="comp-space">O(N)</span>
                </div>
              </div>
            </div>

            {/* Supporting Panel 4: Dry Run */}
            <div className="workspace-sub-panel panel-dryrun">
              <h4 className="sub-panel-title">
                <ScanSearch size={14} className="sub-panel-icon" />
                <span>Dry Run Step-by-Step</span>
              </h4>
              <div className="sub-panel-content">
                <div className="dryrun-state">
                  <span className="state-label">Input nums:</span>
                  <span className="state-val">[3, 2, 4], target=6</span>
                </div>
                <ul className="dryrun-steps-list">
                  <li><span className="step-marker">val=3</span> seen is empty, store 3</li>
                  <li><span className="step-marker">val=2</span> comp=4 not in seen, store 2</li>
                  <li><span className="step-marker">val=4</span> comp=2 is in seen! Return [1, 2]</li>
                </ul>
              </div>
            </div>

            {/* Supporting Panel 5: Revision Note */}
            <div className="workspace-sub-panel panel-revnote">
              <h4 className="sub-panel-title">
                <BookOpenCheck size={14} className="sub-panel-icon" />
                <span>Personalized Revision</span>
              </h4>
              <div className="sub-panel-content">
                <div className="rev-note-header">
                  <span className="rev-note-conf">Confidence: 42%</span>
                  <span className="rev-note-status red">Due Tomorrow</span>
                </div>
                <p className="rev-note-text">
                  Sliding Window dynamic bounds. Focus on correctly shrinking pointers when constraints are violated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LEARNING MODES */}
      <section className="public-section home-modes-section">
        <div className="site-container">
          <div className="section-heading">
            <span className="section-eyebrow">Modes of Study</span>
            <h2 className="section-title">Built-in Learning Modes</h2>
            <p className="section-subtitle">
              Tailor the intelligence response to your current stage of understanding.
            </p>
          </div>

          <div className="modes-grid">
            <div className="mode-card mode-understand">
              <div className="mode-badge-row">
                <span className="mode-badge badge-quick">Quick Mode</span>
              </div>
              <h3 className="mode-card-title">Understand the Problem</h3>
              <p className="mode-card-text">
                Simplify the statement, input/output, examples, constraints, and important edge cases.
              </p>
            </div>

            <div className="mode-card mode-start">
              <div className="mode-badge-row">
                <span className="mode-badge badge-quick">Quick Mode</span>
              </div>
              <h3 className="mode-card-title">Help Me Start</h3>
              <p className="mode-card-text">
                Identify the likely pattern and reveal progressive hints without showing the full solution.
              </p>
            </div>

            <div className="mode-card mode-build">
              <div className="mode-badge-row">
                <span className="mode-badge badge-deep">Deep Mode</span>
              </div>
              <h3 className="mode-card-title">Build the Solution With Me</h3>
              <p className="mode-card-text">
                Learn brute-force, better, and optimal approaches with pseudocode and complexity.
              </p>
            </div>

            <div className="mode-card mode-review">
              <div className="mode-badge-row">
                <span className="mode-badge badge-deep">Deep Mode</span>
              </div>
              <h3 className="mode-card-title">Review My Code</h3>
              <p className="mode-card-text">
                Find bugs, failing cases, missed edge cases, complexity issues, and improvements.
              </p>
            </div>

            <div className="mode-card mode-complete">
              <div className="mode-badge-row">
                <span className="mode-badge badge-deep">Deep Mode</span>
              </div>
              <h3 className="mode-card-title">Show Complete Solution</h3>
              <p className="mode-card-text">
                See the full structured lesson with approaches, code, dry run, complexity, and interview explanation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY ALGOMENTOR */}
      <section className="public-section home-why-section">
        <div className="site-container">
          <div className="why-split-container">
            <div className="why-left">
              <span className="section-eyebrow">The Difference</span>
              <h2 className="why-title">Why AlgoMentor?</h2>
              <p className="why-text">
                Traditional platforms give you a code solution instantly, which leads to passive copy-pasting and weak problem-solving skills.
              </p>
              <p className="why-text">
                AlgoMentor changes how you learn DSA by forcing active learning. We guide you through the process of understanding, designing, and optimizing logic.
              </p>
            </div>

            <div className="why-right">
              <div className="comparison-grid">
                <div className="comp-col typical-platform">
                  <h4 className="comp-col-header">Typical Solution Platform</h4>
                  <ul className="comp-list">
                    <li>Shows final answer quickly</li>
                    <li>Limited reasoning and insights</li>
                    <li>No personalization or memory tracking</li>
                  </ul>
                </div>

                <div className="comp-col algomentor-platform">
                  <h4 className="comp-col-header">AlgoMentor</h4>
                  <ul className="comp-list">
                    <li>Builds understanding first</li>
                    <li>Reveals hints progressively</li>
                    <li>Compares multiple approaches</li>
                    <li>Tracks learning and revision</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRACTICE AND REVISION SECTION */}
      <section className="public-section home-revision-section">
        <div className="site-container">
          <div className="revision-container">
            <div className="revision-info">
              <span className="section-eyebrow">Smart Revision</span>
              <h2 className="revision-title">Track Your Learning and Revision</h2>
              <p className="revision-text">
                AlgoMentor monitors your weak topics, repeated mistakes, and edge cases. Track confidence ratings and get scheduled revision alerts to ensure long-term pattern recall.
              </p>
              <div className="revision-action">
                <Link
                  to={isAuthenticated ? '/revise' : '/login'}
                  className="btn btn-primary"
                >
                  Start Revision Session
                </Link>
              </div>
            </div>

            <div className="revision-preview">
              <div className="preview-revision-card">
                <div className="preview-rev-header">
                  <span className="preview-rev-topic">Sliding Window</span>
                  <span className="preview-rev-conf">42% Confidence</span>
                </div>
                <div className="preview-rev-divider"></div>
                <div className="preview-rev-body">
                  <div className="preview-rev-row">
                    <span className="rev-row-label">Common Mistake</span>
                    <span className="rev-row-value">Shrinking window too late.</span>
                  </div>
                  <div className="preview-rev-row">
                    <span className="rev-row-label">Revision Due</span>
                    <span className="rev-row-value due-badge">Due Tomorrow</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="public-section--compact home-final-cta-section">
        <div className="site-container">
          <div className="final-cta-box">
            <h2 className="final-cta-title">Ready to Understand Your Next DSA Problem?</h2>
            <p className="final-cta-text">
              Start with one problem and turn it into a complete learning session.
            </p>
            <div className="final-cta-actions">
              <Link
                to={isAuthenticated ? '/problems/new' : '/register'}
                className="btn btn-primary btn-lg"
              >
                Start Analyzing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
export { HomePage };
