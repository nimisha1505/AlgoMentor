import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { BookOpen, GitMerge, CheckSquare, MessageSquare, Target, Cpu } from 'lucide-react';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleAnchorClick = (e, targetId) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page-container">
      {/* 1. Hero Area (Page Background) */}
      <header className="hero-outer-wrapper" style={{ padding: '64px 0', backgroundColor: 'var(--bg-page)' }}>
        <div className="hero-two-col container">
          {/* Left Side Info */}
          <div className="hero-left-content">
            <span className="hero-badge">Your personal DSA mentor</span>
            <h1 className="hero-title-main">
              Stop memorising solutions.<br />
              Start understanding patterns.
            </h1>
            <p className="hero-description">
              Paste any DSA problem and learn it through progressive hints, multiple approaches,
              code review, dry runs, and interview-ready explanations.
            </p>
            <div className="hero-actions">
              <Link
                to={isAuthenticated ? '/problems/new' : '/register'}
                className="btn btn-primary"
              >
                Analyse a problem
              </Link>
              <a href="#how-it-works" onClick={(e) => handleAnchorClick(e, 'how-it-works')} className="btn btn-secondary">
                View how it works
              </a>
            </div>
            <span className="hero-trust-line">
              Built for practice, revision, and technical interviews.
            </span>
          </div>

          {/* Right Side Visual Workspace Mockup */}
          <div className="preview-right-side">
            <div className="preview-bar">
              <span>workspace.js</span>
              <span>JS / OPTIMAL</span>
            </div>
            <div className="preview-grid-body">
              <div className="preview-card-item">
                <strong style={{ fontSize: '13px' }}>Two Sum</strong>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Find two numbers that add up to target.
                </p>
              </div>
              
              <div className="preview-card-item">
                <span className="preview-hint-reveal" style={{ fontSize: '11px', fontWeight: '600' }}>
                  Gentle nudge:
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Use a Hash Map to check values in O(1) time.
                </p>
              </div>

              <div className="preview-card-item">
                <div className="preview-row-flex">
                  <span>Brute Force</span>
                  <span>O(N²) Time</span>
                </div>
                <div className="preview-row-flex" style={{ borderBottom: 'none' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Optimal</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '600' }}>O(N) Time</span>
                </div>
              </div>

              <div className="code-block-container" style={{ border: 'none' }}>
                <pre className="code-pre" style={{ padding: '12px' }}>
                  <code className="code-inner" style={{ fontSize: '11px' }}>
{`function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) return [map.get(diff), i];
    map.set(nums[i], i);
  }
}`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. How Students Use Section (Soft Green Surface) */}
      <section id="how-it-works" className="student-flow-section" style={{ backgroundColor: 'var(--primary-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 className="flow-section-title">How students use AlgoMentor</h2>
          <div className="flow-steps-row">
            <div className="flow-step-item">
              <span className="flow-step-num">1</span>
              <span className="flow-step-title">Add a problem</span>
              <p className="flow-step-desc">
                Paste a description, select your programming language, and optionally upload your code.
              </p>
            </div>
            <div className="flow-step-item">
              <span className="flow-step-num">2</span>
              <span className="flow-step-title">Choose what to learn</span>
              <p className="flow-step-desc">
                Select custom modules like hints, edge cases, dry runs, or spoken interview answers.
              </p>
            </div>
            <div className="flow-step-item">
              <span className="flow-step-num">3</span>
              <span className="flow-step-title">Understand every approach</span>
              <p className="flow-step-desc">
                Review step-by-step strategy paths, compare complexities, and read verbal guides.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Feature Section (Soft Violet AI Surface) */}
      <section className="features-grid-section" style={{ padding: '64px 0', backgroundColor: 'var(--ai-soft)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: '700', marginBottom: '32px', color: 'var(--text-primary)' }}>
            Interactive features built for learning
          </h2>
          <div className="feature-cards-grid">
            <div className="feature-grid-item">
              <div className="feature-grid-title">
                <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                <span>Progressive hints</span>
              </div>
              <p className="feature-grid-desc">
                Reveal guided directions step-by-step instead of spoiling the solution.
              </p>
            </div>

            <div className="feature-grid-item">
              <div className="feature-grid-title">
                <Target size={16} style={{ color: 'var(--primary)' }} />
                <span>Pattern recognition</span>
              </div>
              <p className="feature-grid-desc">
                Understand the structural cues pointing to a specific algorithmic strategy.
              </p>
            </div>

            <div className="feature-grid-item">
              <div className="feature-grid-title">
                <GitMerge size={16} style={{ color: 'var(--primary)' }} />
                <span>Brute force to optimal</span>
              </div>
              <p className="feature-grid-desc">
                Compare naive, better, and optimal time-space bounds side-by-side.
              </p>
            </div>

            <div className="feature-grid-item">
              <div className="feature-grid-title">
                <CheckSquare size={16} style={{ color: 'var(--primary)' }} />
                <span>Personal code review</span>
              </div>
              <p className="feature-grid-desc">
                Identify code bugs, logic gaps, and time-space efficiency suggestions.
              </p>
            </div>

            <div className="feature-grid-item">
              <div className="feature-grid-title">
                <Cpu size={16} style={{ color: 'var(--primary)' }} />
                <span>Dry runs and complexity</span>
              </div>
              <p className="feature-grid-desc">
                Follow state-by-step execution traces and mathematical explanations.
              </p>
            </div>

            <div className="feature-grid-item">
              <div className="feature-grid-title">
                <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
                <span>Interview-ready answers</span>
              </div>
              <p className="feature-grid-desc">
                Learn how to explain your approach aloud to a technical interviewer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Student Benefit Strip (Page Background) */}
      <section style={{ padding: '64px 0', backgroundColor: 'var(--bg-page)' }}>
        <div className="container">
          <div className="student-benefit-strip">
            <span className="benefit-title">Use AlgoMentor when you are:</span>
            <div className="benefit-items-list">
              <span className="benefit-item">stuck on a problem</span>
              <span className="benefit-item">revising a pattern</span>
              <span className="benefit-item">comparing solutions</span>
              <span className="benefit-item">preparing for an interview</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
export { HomePage };
