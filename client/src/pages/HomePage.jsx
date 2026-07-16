import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Terminal } from 'lucide-react';

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
      
      {/* 1. HERO SECTION */}
      <section className="home-hero-section">
        <div className="hero-left">
          <span className="hero-eyebrow">A better way to learn DSA</span>
          <h1 className="hero-headline">
            Don’t just get the solution.<br />
            Learn how to reach it.
          </h1>
          <p className="hero-subtext">
            Understand confusing problems, get progressive hints, compare approaches, review your code, and revise weak patterns at the right time.
          </p>
          <div className="hero-actions">
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '15px', fontWeight: '700' }}
            >
              Start Learning
            </Link>
            <a
              href="#how-it-works"
              onClick={(e) => handleAnchorClick(e, 'how-it-works')}
              className="btn-text-action"
            >
              See how it works
            </a>
          </div>
          <p className="hero-trust-line">
            Built for students who want to improve their thinking process, not copy answers.
          </p>
        </div>

        <div className="hero-right">
          {/* Product-preview Workspace Mockup */}
          <div className="workspace-preview-mockup">
            <div className="mockup-header">
              <div>
                <h4 className="mockup-title">Two Sum</h4>
                <div className="mockup-meta">
                  <span className="difficulty easy">Easy</span>
                  <span className="meta-dot">•</span>
                  <span className="topic">Hash Map</span>
                </div>
              </div>
            </div>
            
            <div className="mockup-divider"></div>
            
            <div className="mockup-body">
              <span className="mockup-section-label">Where are you stuck?</span>
              <div className="mockup-row active">
                <span className="mockup-radio-dot active"></span>
                <span className="mockup-row-label">Help Me Start</span>
              </div>

              <div className="mockup-hint-box">
                <span className="hint-title">Hint 1</span>
                <p className="hint-text">
                  Think about values you have already visited.
                </p>
              </div>

              <button type="button" className="mockup-hint-btn" disabled>
                Reveal Hint 2
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STUDENT STRUGGLE SECTION */}
      <section id="how-it-works" className="struggle-section">
        <h2 className="section-title">The struggle is not always coding.</h2>

        <div className="struggle-list">
          <div className="struggle-item">
            <span className="struggle-num">01</span>
            <span className="struggle-text">I don’t understand the question.</span>
          </div>
          <div className="struggle-item">
            <span className="struggle-num">02</span>
            <span className="struggle-text">I don’t know the pattern.</span>
          </div>
          <div className="struggle-item">
            <span className="struggle-num">03</span>
            <span className="struggle-text">I can’t optimise my approach.</span>
          </div>
          <div className="struggle-item">
            <span className="struggle-num">04</span>
            <span className="struggle-text">My code fails hidden cases.</span>
          </div>
          <div className="struggle-item">
            <span className="struggle-num">05</span>
            <span className="struggle-text">I forget the solution later.</span>
          </div>
        </div>
      </section>

      {/* 3. LEARNING JOURNEY */}
      <section id="features" className="journey-section">
        <h2 className="section-title">One workspace for the complete learning journey.</h2>
        
        <div className="timeline-container">
          <div className="timeline-step">
            <div className="step-badge">Understand</div>
            <p className="step-desc">
              Simplify the problem, examples, constraints and edge cases.
            </p>
          </div>
          <div className="timeline-arrow">→</div>
          <div className="timeline-step">
            <div className="step-badge">Start</div>
            <p className="step-desc">
              Identify the pattern and reveal hints progressively.
            </p>
          </div>
          <div className="timeline-arrow">→</div>
          <div className="timeline-step">
            <div className="step-badge">Build</div>
            <p className="step-desc">
              Compare brute-force, better and optimal approaches.
            </p>
          </div>
          <div className="timeline-arrow">→</div>
          <div className="timeline-step">
            <div className="step-badge">Review</div>
            <p className="step-desc">
              Find bugs, missed cases and complexity problems.
            </p>
          </div>
          <div className="timeline-arrow">→</div>
          <div className="timeline-step">
            <div className="step-badge">Revise</div>
            <p className="step-desc">
              Track confidence and revisit weak patterns later.
            </p>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT EXPERIENCE SECTION */}
      <section className="experience-section">
        <h2 className="section-title">A learning workspace, not an answer generator.</h2>
        
        <div className="experience-document-mockup">
          <div className="doc-section">
            <span className="doc-label">Problem in Simple Words</span>
            <ul className="doc-list">
              <li>You are given an array and a target.</li>
              <li>Find two different values whose sum equals the target.</li>
              <li>Return their indices.</li>
            </ul>
          </div>

          <div className="doc-section">
            <span className="doc-label">Likely Pattern</span>
            <p className="doc-text-highlight">Hash Map Lookup</p>
          </div>

          <div className="doc-section">
            <span className="doc-label">Hint 1</span>
            <p className="doc-text">Remember each value while scanning the array.</p>
          </div>

          <div className="doc-section">
            <span className="doc-action-text">[Reveal Hint 2]</span>
          </div>
        </div>
      </section>

      {/* 5. APPROACH COMPARISON SECTION */}
      <section className="comparison-section">
        <h2 className="section-title">Learn why one solution is better than another.</h2>
        
        <div className="table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Approach</th>
                <th>Time</th>
                <th>Space</th>
                <th>Best for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold">Brute Force</td>
                <td>O(n²)</td>
                <td>O(1)</td>
                <td>First idea</td>
              </tr>
              <tr>
                <td className="font-bold">Hash Map</td>
                <td>O(n)</td>
                <td>O(n)</td>
                <td>Efficient lookup</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. PERSONAL LEARNING SECTION */}
      <section className="personal-section">
        <div className="personal-left">
          <h2 className="section-title text-left">Learn from every attempt.</h2>
          <p className="personal-copy">
            AlgoMentor remembers:
          </p>
          <ul className="personal-list">
            <li>weak patterns</li>
            <li>repeated mistakes</li>
            <li>missed edge cases</li>
            <li>confidence</li>
            <li>hints used</li>
            <li>revision dates</li>
          </ul>
        </div>

        <div className="personal-right">
          <div className="learning-summary-panel">
            <div className="panel-header">
              <span className="panel-title">Sliding Window</span>
              <span className="panel-badge">42% confidence</span>
            </div>
            
            <div className="panel-divider"></div>
            
            <div className="panel-body">
              <div className="panel-item">
                <span className="panel-item-label">Common mistake:</span>
                <span className="panel-item-val">Shrinking the window too late.</span>
              </div>
              <div className="panel-item">
                <span className="panel-item-label">Next step:</span>
                <span className="panel-item-val">Practise one medium sliding-window problem.</span>
              </div>
              <div className="panel-item">
                <span className="panel-item-label">Revision:</span>
                <span className="panel-item-val highlight-danger">Due tomorrow.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. DIFFERENTIATION SECTION */}
      <section className="differentiation-section">
        <h2 className="section-title">Why not just ask for the answer?</h2>
        
        <div className="diff-grid">
          <div className="diff-column">
            <h4 className="diff-col-title">Generic answer generator:</h4>
            <hr className="diff-divider" />
            <ul className="diff-list list-red">
              <li>gives the complete answer</li>
              <li>does not track learning history</li>
              <li>does not schedule revision</li>
            </ul>
          </div>

          <div className="diff-column">
            <h4 className="diff-col-title accent-green">AlgoMentor:</h4>
            <hr className="diff-divider" />
            <ul className="diff-list list-green">
              <li>adapts to where the student is stuck</li>
              <li>reveals hints progressively</li>
              <li>compares approaches</li>
              <li>reviews student code</li>
              <li>tracks weak patterns and revision</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="final-cta-section">
        <h2 className="cta-title">Ready to solve problems differently?</h2>
        <p className="cta-subtext">
          Build the thinking process that helps you solve the next problem yourself.
        </p>
        <div className="cta-actions">
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="btn btn-primary"
            style={{ padding: '14px 32px', fontSize: '15px', fontWeight: '700' }}
          >
            Start Learning
          </Link>
          <Link
            to="/login"
            className="btn-text-action"
          >
            Sign In
          </Link>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
export { HomePage };
