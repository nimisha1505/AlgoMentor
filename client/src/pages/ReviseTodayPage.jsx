import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyProblems, updateProblemLearning } from '../api/problem.api.js';
import { getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, BookOpen, ExternalLink, Edit3, Save } from 'lucide-react';

const ReviseTodayPage = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLoadings, setOpenLoadings] = useState({});

  // Form input changes per row
  const [editingRows, setEditingRows] = useState({});

  const fetchRevisionProblems = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMyProblems({ revisionDue: 'true', page: 1, limit: 50 });
      // Sort oldest due first (a - b)
      const sorted = (data.problems || []).sort((a, b) => {
        if (!a.nextRevisionAt) return 1;
        if (!b.nextRevisionAt) return -1;
        return new Date(a.nextRevisionAt) - new Date(b.nextRevisionAt);
      });
      setProblems(sorted);

      // Prepopulate edit states
      const initialEdits = {};
      sorted.forEach((p) => {
        initialEdits[p._id] = {
          confidence: p.confidence || 'learning',
          nextRevisionAt: p.nextRevisionAt ? new Date(p.nextRevisionAt).toISOString().split('T')[0] : '',
        };
      });
      setEditingRows(initialEdits);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisionProblems();
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

  const handleRowChange = (pId, field, value) => {
    setEditingRows((prev) => ({
      ...prev,
      [pId]: {
        ...prev[pId],
        [field]: value,
      },
    }));
  };

  const handleSaveRow = async (pId) => {
    const editState = editingRows[pId];
    try {
      await updateProblemLearning(pId, {
        confidence: editState.confidence,
        nextRevisionAt: editState.nextRevisionAt ? new Date(editState.nextRevisionAt).toISOString() : null,
      });
      alert('Revision details saved successfully.');
      // Refresh the page data
      fetchRevisionProblems();
    } catch (err) {
      alert('Failed to update revision: ' + getApiErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="loader-container" style={{ minHeight: '50vh' }}>
        <Loader text="Fetching revision timeline..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>

      <header style={{ marginBottom: '32px' }}>
        <h1 className="welcome-title" style={{ fontSize: '28px' }}>Revise Today</h1>
        <p className="welcome-subtitle">
          Review saved concepts that are due for reinforcement based on your confidence scoring.
        </p>
      </header>

      {error && <FormError message={error} />}

      {problems.length === 0 ? (
        <div className="empty-state-container" style={{ padding: '48px 24px' }}>
          <span className="empty-state-title">No revision due</span>
          <span className="empty-state-description">
            Everything is up-to-date. Spaced repetition dates are automatically set based on practicing activity.
          </span>
          <div className="empty-state-action">
            <Link to="/problems" className="btn btn-primary">
              Browse saved problems
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {problems.map((problem) => {
            const pId = problem._id;
            const edits = editingRows[pId] || {};
            const isCompleted = (problem.status || '').toLowerCase() === 'completed';

            return (
              <div
                key={pId}
                className="preview-card-item"
                style={{
                  padding: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr',
                  gap: '24px',
                  alignItems: 'center',
                }}
              >
                {/* Title & Status */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 6px 0' }}>{problem.title}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge status={problem.status} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Topic: {problem.topics?.join(', ') || 'other'}
                    </span>
                  </div>
                </div>

                {/* Inline Learning Config */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="form-group" style={{ margin: '0', flex: 1 }}>
                    <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Confidence
                    </label>
                    <select
                      value={edits.confidence}
                      onChange={(e) => handleRowChange(pId, 'confidence', e.target.value)}
                      style={{ fontSize: '12px', padding: '4px 6px', height: '28px' }}
                    >
                      <option value="weak">Weak</option>
                      <option value="learning">Learning</option>
                      <option value="confident">Confident</option>
                      <option value="mastered">Mastered</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: '0', flex: 1.2 }}>
                    <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Reschedule
                    </label>
                    <input
                      type="date"
                      value={edits.nextRevisionAt}
                      onChange={(e) => handleRowChange(pId, 'nextRevisionAt', e.target.value)}
                      style={{ fontSize: '12px', padding: '2px 6px', height: '28px' }}
                    />
                  </div>

                  <button
                    onClick={() => handleSaveRow(pId)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0 8px', height: '28px', marginTop: '16px' }}
                    title="Save changes"
                  >
                    <Save size={14} />
                  </button>
                </div>

                {/* Open / Actions */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleOpenProblem(problem)}
                    disabled={openLoadings[pId]}
                    className="btn btn-secondary btn-sm icon-btn"
                  >
                    <BookOpen size={12} />
                    <span>Open specifications</span>
                  </button>

                  {isCompleted && (
                    <button
                      onClick={() => handleOpenProblem(problem)}
                      disabled={openLoadings[pId]}
                      className="btn btn-primary btn-sm icon-btn"
                    >
                      <ExternalLink size={12} />
                      <span>View analysis</span>
                    </button>
                  )}

                  <Link to={`/problems/${pId}/edit`} className="btn btn-secondary btn-sm icon-btn">
                    <Edit3 size={12} />
                    <span>Edit & retry</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviseTodayPage;
export { ReviseTodayPage };
