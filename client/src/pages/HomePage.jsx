import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { BookOpen, GitMerge, CheckSquare, MessageSquare } from 'lucide-react';

/**
 * Public landing/home page detailing the features of AlgoMentor.
 */
const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page-container">
      <section className="hero-section">
        <h1 className="hero-title">AlgoMentor</h1>
        <h2 className="hero-headline">Understand DSA. Don’t just memorize it.</h2>
        <p className="hero-description">
          AlgoMentor is an interactive study platform that breaks down complex data
          structures and algorithms step-by-step. Write code, understand trade-offs, and learn
          how to explain your choices conceptually in technical interviews.
        </p>
        <div className="hero-actions">
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="btn btn-primary"
          >
            Start Learning
          </Link>
          {!isAuthenticated && (
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
          )}
        </div>
      </section>

      <section className="features-grid">
        <div className="feature-card">
          <BookOpen className="feature-icon" />
          <h3 className="feature-card-title">Progressive Hints</h3>
          <p className="feature-card-text">
            Get subtle nudges rather than straight-out spoilers. Learn to solve problems
            conceptually, moving step-by-step through mental blocks.
          </p>
        </div>
        <div className="feature-card">
          <GitMerge className="feature-icon" />
          <h3 className="feature-card-title">Multiple Approaches</h3>
          <p className="feature-card-text">
            Explore diverse solution pathways, starting from brute-force tactics up to
            optimal, highly-scalable algorithms.
          </p>
        </div>
        <div className="feature-card">
          <CheckSquare className="feature-icon" />
          <h3 className="feature-card-title">Code Review</h3>
          <p className="feature-card-text">
            Submit your draft implementation to detect correctness errors, trace bugs, review complexity,
            and inspect formatting improvements.
          </p>
        </div>
        <div className="feature-card">
          <MessageSquare className="feature-icon" />
          <h3 className="feature-card-title">Interview Explanations</h3>
          <p className="feature-card-text">
            Learn to verbalize your thinking process. Get clear, candidate-level verbal walkthroughs
            tailored for mock or real technical interviews.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
export { HomePage };
