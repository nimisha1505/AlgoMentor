import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import FormError from '../components/common/FormError.jsx';
import { Terminal } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { email, password } = formData;
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }

    setIsPending(true);
    try {
      await login({ email: email.trim(), password });
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left visual/product panel (55%) */}
      <div className="auth-split-left-visual">
        <div className="auth-visual-grid-bg"></div>
        
        <Link to="/" className="brand-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit', zIndex: 10 }}>
          <Terminal size={22} className="brand-icon" style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>AlgoMentor</span>
        </Link>
 
        <div className="visual-hero-copy">
          <h2 className="visual-hero-title" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.25' }}>
            Build intuition,<br />
            not a folder of memorised solutions.
          </h2>
          <p className="visual-hero-desc" style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '12px' }}>
            Turn difficult DSA problems into patterns, hints, approaches, dry runs, and interview-ready explanations.
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
            <span>TWO SUM</span>
          </div>
          <div className="mock-window-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="mock-item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span className="mock-lbl" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Problem</span>
              <span className="mock-val" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Two Sum</span>
            </div>
            <div className="mock-item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span className="mock-lbl" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Pattern</span>
              <span className="mock-val" style={{ color: 'var(--ai-accent)', fontWeight: '700' }}>💡 Hash map lookup</span>
            </div>
            <div className="mock-item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span className="mock-lbl" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Hint 1</span>
              <span className="mock-val" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Store complement values in a Hash Map to check in O(1) time.
              </span>
            </div>
            <div className="mock-item-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: 'none', borderBottom: 'none' }}>
              <span className="mock-lbl" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Complexity</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Naive: <code style={{ color: 'var(--danger)' }}>O(N²)</code></span>
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>Optimal: <code>O(N)</code></span>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      {/* Right form panel (45%) */}
      <div className="auth-split-right-form">
        <div className="auth-split-focused-area">
          {/* Small mobile brand header */}
          <Link to="/" className="mobile-only-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            <Terminal size={22} className="brand-icon" style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>AlgoMentor</span>
          </Link>
 
          <header style={{ marginBottom: '24px' }}>
            <h1 className="auth-split-form-title">Welcome back</h1>
            <p className="auth-split-form-subtitle">Continue building your problem-solving intuition.</p>
          </header>
 
          {success && <div className="form-success" style={{ marginBottom: '16px' }}>{success}</div>}
          <FormError message={error} />
 
          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '16px' }}>
            <div className="form-group">
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
            </div>
 
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-block"
              style={{ marginTop: '24px', height: '48px', width: '100%' }}
            >
              {isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
 
          <p className="auth-switch" style={{ marginTop: '24px', textAlign: 'left' }}>
            New to AlgoMentor? <Link to="/register">Create your workspace</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
 
export default LoginPage;
export { LoginPage };
