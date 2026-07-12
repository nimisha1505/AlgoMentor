import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import FormError from '../components/common/FormError.jsx';
import { Terminal, Award, HelpCircle, Layers } from 'lucide-react';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { fullName, username, email, password, confirmPassword } = formData;

    if (
      !fullName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password must match');
      return;
    }

    setIsPending(true);
    try {
      await register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      navigate('/login', {
        state: { successMessage: 'Registration successful. Please sign in.' },
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left visual panel */}
      <div className="auth-split-left-visual">
        <div className="auth-visual-grid-bg"></div>
        <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={22} className="brand-icon" />
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>AlgoMentor</span>
        </div>

        <div className="visual-hero-copy">
          <h2 className="visual-hero-title">
            Turn every practice problem<br />
            into a reusable lesson.
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <HelpCircle size={20} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>Reveal hints gradually</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>Avoid spoilers by stepping through guided clues.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Layers size={20} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>Compare brute force to optimal</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>Analyze space-time complexity scaling boundaries.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Award size={20} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>Practise interview explanations</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>Gain access to concise verbal strategic guidelines.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-split-right-form">
        <div className="auth-split-focused-area">
          {/* Small mobile brand header */}
          <div className="mobile-only-header" style={{ marginBottom: '24px', alignItems: 'center', gap: '8px' }}>
            <Terminal size={22} className="brand-icon" />
            <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>AlgoMentor</span>
          </div>

          <header style={{ marginBottom: '24px' }}>
            <h1 className="auth-split-form-title">Create your workspace</h1>
            <p className="auth-split-form-subtitle">Start learning DSA with structured guidance.</p>
          </header>

          <FormError message={error} />

          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '16px' }}>
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  disabled={isPending}
                  className="dark-form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  required
                  disabled={isPending}
                  className="dark-form-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@domain.com"
                required
                disabled={isPending}
                className="dark-form-input"
              />
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={isPending}
                className="dark-form-input"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Use at least 8 characters.
              </span>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={isPending}
                className="dark-form-input"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-block"
              style={{ marginTop: '24px', height: '48px' }}
            >
              {isPending ? 'Registering...' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: '24px', textAlign: 'left' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
export { RegisterPage };
