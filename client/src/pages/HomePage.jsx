import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Terminal, ArrowRight, HelpCircle, Key, ShieldAlert, Cpu, Award, RefreshCw, BarChart2 } from 'lucide-react';

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
    <div className="home-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '80px', paddingBottom: '80px' }}>
      
      {/* 1. Hero Section */}
      <section className="hero-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', paddingTop: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{
            alignSelf: 'flex-start',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: 'var(--primary)',
            backgroundColor: 'var(--primary-soft)',
            padding: '6px 12px',
            borderRadius: '20px',
            letterSpacing: '0.5px'
          }}>
            A personalised DSA learning and improvement platform
          </span>
          
          <h1 style={{ fontSize: '44px', fontWeight: '800', lineHeight: '1.15', color: 'var(--text-primary)', margin: 0, letterSpacing: '-1.2px' }}>
            Stop collecting solutions.<br />
            Start improving <span style={{ color: 'var(--primary)' }}>how you solve.</span>
          </h1>
          
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            AlgoMentor explains problems step by step, reviews your code, tracks the patterns and edge cases you struggle with, and recommends the right questions to practise next.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '14px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Start Your Learning Path</span>
              <ArrowRight size={16} />
            </Link>
            
            <a
              href="#how-it-works"
              onClick={(e) => handleAnchorClick(e, 'how-it-works')}
              className="btn btn-secondary"
              style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '600' }}
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Hero Product Preview Visual representing the Loop */}
        <div className="hero-visual-loop" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '12px',
          padding: '24px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03)',
          position: 'relative'
        }}>
          {/* Section header info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace' }}>
              Personal Learning Loop
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--ai-accent)' }}></span>
            </div>
          </div>

          {/* 1. Current Problem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Problem
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Longest Substring Without Repeating Characters
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0', color: 'var(--text-muted)' }}>
            <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
          </div>

          {/* 2. Detected Weakness & Insight Group */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', border: '1px solid #dbeafe', borderRadius: 'var(--radius-sm)', backgroundColor: '#eff6ff' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#1e40af', display: 'block', textTransform: 'uppercase' }}>
                Weak Pattern
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e3a8a', display: 'block', marginTop: '2px' }}>
                Variable Sliding Window
              </span>
              <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                42% Confidence
              </span>
            </div>

            <div style={{ padding: '12px', border: '1px solid var(--warning-soft)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--warning-soft)', borderLeft: '3px solid var(--warning)' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--warning)', display: 'block', textTransform: 'uppercase' }}>
                Mistake Insight
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-primary)', display: 'block', marginTop: '2px', lineHeight: '1.3' }}>
                You repeatedly missed the window-shrinking condition.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0', color: 'var(--text-muted)' }}>
            <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
          </div>

          {/* 3. Complexity Attempt Improvement */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>
              Attempt Improvement
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600' }}>
              <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>Previous: O(n²)</span>
              <ArrowRight size={12} />
              <span style={{ color: 'var(--primary)' }}>Current: O(n)</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0', color: 'var(--text-muted)' }}>
            <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
          </div>

          {/* 4. Recommendation & Revision */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-page)' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--ai-accent)', display: 'block', textTransform: 'uppercase' }}>
                Targeted Practice
              </span>
              <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>
                Minimum Size Subarray Sum
              </span>
            </div>

            <div style={{ padding: '12px', border: '1px solid #f0fdf4', borderRadius: 'var(--radius-sm)', backgroundColor: '#f0fdf4' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#166534', display: 'block', textTransform: 'uppercase' }}>
                Personal Revision
              </span>
              <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#14532d', display: 'block', marginTop: '2px' }}>
                Review in 3 days
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Unique Value Section: More than an AI solution generator */}
      <section style={{
        padding: '48px 24px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', textAlign: 'center', color: 'var(--text-primary)', marginBottom: '12px', margin: 0 }}>
          More than an AI solution generator
        </h2>
        <p style={{ textAlign: 'center', fontSize: '14.5px', color: 'var(--text-secondary)', marginBottom: '36px', marginTop: 0 }}>
          Unlike standard AI chatbots that output immediate code dumps, AlgoMentor is built to actively diagnose and fix your solving habits.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          
          {/* Normal AI Column */}
          <div style={{ padding: '24px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '16px', marginTop: 0 }}>
              Generic AI Tools
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>✕</span>
                <span>Give one large answers that skip the learning process</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>✕</span>
                <span>Reveal the complete solution immediately, preventing practice</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>✕</span>
                <span>Forget the student's previous attempts and repeat suggestions</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>✕</span>
                <span>Recommend random or generic questions based on popularity</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>✕</span>
                <span>Do not track weak patterns, errors, or long-term revision needs</span>
              </li>
            </ul>
          </div>

          {/* AlgoMentor Column */}
          <div style={{ padding: '24px', backgroundColor: 'var(--primary-soft)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(22, 139, 98, 0.15)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', marginBottom: '16px', marginTop: 0 }}>
              AlgoMentor
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
                <span><strong>Gives progressive hints first</strong> to guide your thinking flow</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
                <span><strong>Reviews your own code</strong> drafts for syntax and logical correctness</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
                <span><strong>Detects missed edge cases</strong> and runtime complexity bottlenecks</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
                <span><strong>Compares attempts</strong> side-by-side to highlight runtime updates</span>
              </li>
              <li style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
                <span><strong>Tracks weak DSA patterns</strong> and schedules spaced repetitions</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* 3. Personal Learning Loop Section */}
      <section id="how-it-works" style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            Your learning improves after every problem
          </h2>
          <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', marginTop: '8px', margin: 0 }}>
            AlgoMentor closes the loop between practicing, discovering weaknesses, and correcting concepts.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          
          <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>STEP 01</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>Attempt a problem</strong>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0, lineHeight: '1.4' }}>
              Solve a problem or paste your current code to analyse complexity bounds and run configurations.
            </p>
          </div>

          <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>STEP 02</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>Discover weak patterns</strong>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0, lineHeight: '1.4' }}>
              Review structural insights highlighting logic bugs, brute-force biases, and missed boundary parameters.
            </p>
          </div>

          <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>STEP 03</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>Improve your approach</strong>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0, lineHeight: '1.4' }}>
              Refine your implementation with progressive, step-by-step conceptual hints rather than direct answers.
            </p>
          </div>

          <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>STEP 04</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>Practise next target</strong>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0, lineHeight: '1.4' }}>
              Get automated recommendations selecting adjacent questions aimed at solving your pattern issues.
            </p>
          </div>

          <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>STEP 05</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>Revise at the right time</strong>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', margin: 0, lineHeight: '1.4' }}>
              Retain DSA concepts using built-in spaced-repetition notifications for weak items.
            </p>
          </div>

        </div>
      </section>

      {/* 4. Six Key Feature Priorities */}
      <section id="features" style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', textAlign: 'center', color: 'var(--text-primary)', margin: 0 }}>
          Interactive features built for learning
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          
          {/* Feature 1 */}
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <Key size={18} />
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Progressive hints before solutions</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Reveal conceptual nudges and logic diagrams step-by-step instead of spoiling the complete code immediately.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <Terminal size={18} />
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Student-code review</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Submit your code draft for detailed analysis of edge-case bugs, algorithmic mistakes, and logic updates.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <ShieldAlert size={18} />
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Missed edge-case detection</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Identify subtle boundary situations, integer overflows, and empty array limits that break your current logic.
            </p>
          </div>

          {/* Feature 4 */}
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <Cpu size={18} />
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Attempt comparison</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              View performance scaling and time-space bottlenecks between your initial and optimized coding attempts.
            </p>
          </div>

          {/* Feature 5 */}
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <BarChart2 size={18} />
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Weak-pattern tracking</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              AlgoMentor isolates pattern dependencies, confidence levels, and tracks structural issues automatically.
            </p>
          </div>

          {/* Feature 6 */}
          <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <Award size={18} />
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Personalised practice & revision</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Receive targeted suggestions to practice correct patterns and set automatic repetition alerts.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Final CTA Section */}
      <section style={{
        padding: '56px 32px',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-inverse)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Build a DSA learning path based on your real mistakes.
        </h2>
        <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', margin: 0, maxWidth: '580px', lineHeight: '1.5' }}>
          Start with one problem. AlgoMentor will help you understand, improve, practise and revise.
        </p>
        <Link
          to={isAuthenticated ? '/dashboard' : '/register'}
          className="btn btn-primary"
          style={{ padding: '14px 36px', fontSize: '14px', fontWeight: '700', marginTop: '8px' }}
        >
          Start Your First Problem
        </Link>
      </section>

    </div>
  );
};

export default HomePage;
export { HomePage };
