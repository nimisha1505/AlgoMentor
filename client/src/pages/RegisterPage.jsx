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
  const [validationErrors, setValidationErrors] = useState({});
  const [isPending, setIsPending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    const { fullName, username, email, password, confirmPassword } = formData;
    const errors = {};

    // Validate fields presence
    if (!fullName.trim()) errors.fullName = 'Full name is required';
    if (!username.trim()) errors.username = 'Username is required';
    
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must contain at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Password and confirm password must match';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
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

        <Link to="/" className="brand-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit', zIndex: 10 }}>
          <Terminal size={22} className="brand-icon" style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>AlgoMentor</span>
        </Link>

        <div className="visual-hero-copy">
          <h2 className="visual-hero-title" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.25' }}>
            Turn every practice problem<br />
            into a reusable lesson.
          </h2>
          <p className="visual-hero-desc" style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '12px' }}>
            Avoid grinding blindly. Understand the logic behind optimal solutions with structured interactive guidance.
          </p>
        </div>

        {/* CSS Mock Workspace Preview Block */}
        <div className="visual-mock-workspace" style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '440px',
          zIndex: 2
        }}>
          <div className="mock-window-header" style={{
            backgroundColor: 'var(--bg-page)',
            borderBottom: '1px solid var(--border)',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: 'var(--text-secondary)'
          }}>
            <span>workspace.js</span>
            <span>CLIMBING STAIRS</span>
          </div>
          <div className="mock-window-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="mock-item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span className="mock-lbl" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Problem</span>
              <span className="mock-val" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Climbing Stairs</span>
            </div>
            <div className="mock-item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span className="mock-lbl" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Approach</span>
              <span className="mock-val" style={{ color: 'var(--ai-accent)', fontWeight: '700' }}>💡 Bottom-up DP</span>
            </div>
            <div className="mock-item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span className="mock-lbl" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Recurrence</span>
              <span className="mock-val" style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontFamily: 'monospace' }}>
                dp[i] = dp[i-1] + dp[i-2]
              </span>
            </div>
            <div className="mock-item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: 'none', borderBottom: 'none' }}>
              <span className="mock-lbl" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>State Space</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Space: <code style={{ color: 'var(--danger)' }}>O(N)</code></span>
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>Optimised Space: <code>O(1)</code></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-split-right-form">
        <div className="auth-split-focused-area">
          {/* Small mobile brand header */}
          <Link to="/" className="mobile-only-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            <Terminal size={22} className="brand-icon" style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>AlgoMentor</span>
          </Link>

          <header style={{ marginBottom: '24px' }}>
            <h1 className="auth-split-form-title">Create your workspace</h1>
            <p className="auth-split-form-subtitle">Start learning DSA with structured guidance.</p>
          </header>

          <FormError message={error} />

          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '16px' }} noValidate>
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
                  className={`dark-form-input ${validationErrors.fullName ? 'input-invalid' : ''}`}
                />
                {validationErrors.fullName && (
                  <span className="field-error-text" aria-live="polite">
                    {validationErrors.fullName}
                  </span>
                )}
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
                  className={`dark-form-input ${validationErrors.username ? 'input-invalid' : ''}`}
                />
                {validationErrors.username && (
                  <span className="field-error-text" aria-live="polite">
                    {validationErrors.username}
                  </span>
                )}
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
                className={`dark-form-input ${validationErrors.email ? 'input-invalid' : ''}`}
              />
              {validationErrors.email && (
                <span className="field-error-text" aria-live="polite">
                  {validationErrors.email}
                </span>
              )}
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
                className={`dark-form-input ${validationErrors.password ? 'input-invalid' : ''}`}
              />
              {validationErrors.password ? (
                <span className="field-error-text" aria-live="polite">
                  {validationErrors.password}
                </span>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Use at least 8 characters.
                </span>
              )}
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
                className={`dark-form-input ${validationErrors.confirmPassword ? 'input-invalid' : ''}`}
              />
              {validationErrors.confirmPassword && (
                <span className="field-error-text" aria-live="polite">
                  {validationErrors.confirmPassword}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-block"
              style={{ marginTop: '24px', height: '48px', width: '100%' }}
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
