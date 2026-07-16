import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProblemById, updateProblemLearning } from '../api/problem.api.js';
import { startProblemAnalysis, getProblemAnalyses, getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, Play, ExternalLink, RotateCw, Calendar, Layers, Edit3, Clock, Cpu, Award, Star, Plus, X } from 'lucide-react';

const SUPPORTED_TOPICS = [
  'arrays',
  'strings',
  'hashing',
  'linkedList',
  'stack',
  'queue',
  'binarySearch',
  'recursion',
  'backtracking',
  'trees',
  'bst',
  'heap',
  'graph',
  'dynamicProgramming',
  'greedy',
  'slidingWindow',
  'twoPointers',
  'prefixSum',
  'bitManipulation',
  'mathematics',
  'other',
];

const ProblemDetailPage = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Analyses History state
  const [analyses, setAnalyses] = useState([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [selectedAttempts, setSelectedAttempts] = useState([]);

  // Learning metadata states
  const [topics, setTopics] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [patternInput, setPatternInput] = useState('');
  const [confidence, setConfidence] = useState('learning');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [studentNotes, setStudentNotes] = useState('');
  const [nextRevisionAt, setNextRevisionAt] = useState('');
  const [isSavingLearning, setIsSavingLearning] = useState(false);
  const [learningError, setLearningError] = useState('');
  const [learningSuccess, setLearningSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('problem');

  const handleToggleSelectAttempt = (attemptId) => {
    setSelectedAttempts((prev) => {
      if (prev.includes(attemptId)) {
        return prev.filter((id) => id !== attemptId);
      } else {
        if (prev.length >= 2) {
          alert('You can select a maximum of two attempts to compare.');
          return prev;
        }
        return [...prev, attemptId];
      }
    });
  };

  const fetchProblem = async () => {
    try {
      const data = await getProblemById(problemId);
      setProblem(data);
      // Prepopulate learning states
      setTopics(data.topics || []);
      setPatterns(data.patterns || []);
      setConfidence(data.confidence || 'learning');
      setIsBookmarked(!!data.isBookmarked);
      setStudentNotes(data.studentNotes || '');
      setNextRevisionAt(data.nextRevisionAt ? new Date(data.nextRevisionAt).toISOString().split('T')[0] : '');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const fetchAnalyses = async () => {
    setAnalysesLoading(true);
    try {
      const data = await getProblemAnalyses(problemId, { page: 1, limit: 10, sort: 'newest' });
      setAnalyses(data.analyses || []);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setAnalysesLoading(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      setError('');
      await Promise.all([fetchProblem(), fetchAnalyses()]);
      setIsLoading(false);
    };
    loadAll();
  }, [problemId]);

  const handleGenerate = async () => {
    setActionLoading(true);
    try {
      const analysis = await startProblemAnalysis(problemId);
      navigate(`/analyses/${analysis._id}`);
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewLatest = async () => {
    setActionLoading(true);
    try {
      const analysis = await getLatestProblemAnalysis(problemId);
      navigate(`/analyses/${analysis._id}`);
    } catch (err) {
      alert(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveLearning = async () => {
    setIsSavingLearning(true);
    setLearningError('');
    setLearningSuccess('');
    try {
      const updated = await updateProblemLearning(problemId, {
        topics,
        patterns,
        confidence,
        isBookmarked,
        studentNotes,
        nextRevisionAt: nextRevisionAt ? new Date(nextRevisionAt).toISOString() : null,
      });
      setProblem(updated);
      setLearningSuccess('Learning metadata updated successfully!');
      setTimeout(() => setLearningSuccess(''), 3000);
    } catch (err) {
      setLearningError(getApiErrorMessage(err));
    } finally {
      setIsSavingLearning(false);
    }
  };

  const handleAddPattern = (e) => {
    e.preventDefault();
    const val = patternInput.trim();
    if (!val) return;
    if (patterns.length >= 20) {
      alert('Cannot exceed 20 pattern tags');
      return;
    }
    if (patterns.includes(val)) {
      setPatternInput('');
      return;
    }
    setPatterns([...patterns, val]);
    setPatternInput('');
  };

  const handleRemovePattern = (tag) => {
    setPatterns(patterns.filter((p) => p !== tag));
  };

  const handleTopicToggle = (topic) => {
    if (topics.includes(topic)) {
      setTopics(topics.filter((t) => t !== topic));
    } else {
      setTopics([...topics, topic]);
    }
  };

  const getLanguageLabel = (lang) => {
    const labels = {
      cpp: 'C++',
      java: 'Java',
      python: 'Python',
      javascript: 'JavaScript',
      c: 'C',
      other: 'Other',
    };
    return labels[lang] || lang;
  };

  if (isLoading) {
    return (
      <div className="loader-container">
        <Loader text="Loading problem specifications..." />
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="problem-detail-workspace container">
        <div className="reading-header">
          <Link to="/problems" className="back-link">
            <ArrowLeft size={14} /> Back to My Problems
          </Link>
        </div>
        <FormError message={error || 'Failed to locate problem.'} />
      </div>
    );
  }


  const normalizedStatus = (problem.status || '').toLowerCase();

  return (
    <div className="problem-detail-workspace container" style={{ paddingBottom: '80px', paddingTop: '16px' }}>
      {actionLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <Loader text="Building your analysis" />
          </div>
        </div>
      )}

      {/* Top Bar Navigation & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <Link to="/problems" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
          <ArrowLeft size={14} /> Back to My Problems
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="reading-tag" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
            {getLanguageLabel(problem.language)}
          </span>
          <StatusBadge status={problem.status} />

          <Link to={`/problems/${problem._id}/edit`} className="btn btn-secondary btn-sm icon-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>
            <Edit3 size={14} />
            <span>Edit Problem</span>
          </Link>
        </div>
      </div>

      {/* Header Info */}
      <header style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <h1 className="reading-title" style={{ fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
            {problem.title}
          </h1>
          {problem.difficulty && problem.difficulty !== 'unknown' && (
            <span className={`difficulty-badge ${problem.difficulty}`} style={{
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '12px',
              color: '#ffffff',
              backgroundColor: problem.difficulty === 'easy' ? 'var(--primary)' : problem.difficulty === 'medium' ? 'var(--warning-amber)' : 'var(--danger)'
            }}>
              {problem.difficulty}
            </span>
          )}
          {problem.source && problem.source !== 'custom' && (
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-soft)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)'
            }}>
              {problem.sourceUrl ? (
                <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>{problem.source === 'gfg' ? 'GeeksforGeeks' : problem.source === 'leetcode' ? 'LeetCode' : problem.source}</span>
                  <ExternalLink size={10} />
                </a>
              ) : (
                problem.source === 'gfg' ? 'GeeksforGeeks' : problem.source === 'leetcode' ? 'LeetCode' : problem.source
              )}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            <span>Updated: {new Date(problem.updatedAt).toLocaleDateString()}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} />
            <span>Modules: {problem.requestedSections?.length || 0} selected</span>
          </span>
        </div>
      </header>

      {/* 2-Column Detail Layout */}
      <div className="detail-reading-layout" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column: Tabbed contents */}
        <div>
          {/* Tab Selector Buttons */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
            {[
              { id: 'problem', label: 'Problem' },
              { id: 'solution', label: 'Your Solution' },
              { id: 'analysis', label: 'Analysis' },
              { id: 'notes', label: 'Notes' },
              { id: 'history', label: 'History' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === t.id ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '13.5px'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Views */}
          {activeTab === 'problem' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section className="reading-section">
                <h3 className="reading-section-title" style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px' }}>Problem Statement</h3>
                <div className="reading-body text-pre-wrap" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  {problem.problemStatement}
                </div>
              </section>

              {problem.constraints && problem.constraints.length > 0 && (
                <section className="reading-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <h3 className="reading-section-title" style={{ fontSize: '15px', fontWeight: '800', marginBottom: '8px' }}>Constraints</h3>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', margin: 0 }}>
                    {problem.constraints.map((c, idx) => (
                      <li key={idx} style={{ color: 'var(--text-secondary)' }}>{c}</li>
                    ))}
                  </ul>
                </section>
              )}

              {problem.examples && problem.examples.length > 0 && (
                <section className="reading-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <h3 className="reading-section-title" style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px' }}>Examples</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {problem.examples.map((ex, idx) => (
                      <div key={idx} style={{ padding: '16px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <strong style={{ fontSize: '13px', display: 'block', color: 'var(--primary)', marginBottom: '8px' }}>
                          Example {idx + 1}
                        </strong>
                        <p style={{ fontSize: '13px', margin: '0 0 4px 0' }}>
                          <strong>Input:</strong> <code>{ex.input}</code>
                        </p>
                        <p style={{ fontSize: '13px', margin: '0 0 8px 0' }}>
                          <strong>Output:</strong> <code>{ex.output}</code>
                        </p>
                        {ex.explanation && (
                          <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)' }}>
                            <strong>Explanation:</strong> {ex.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'solution' && (
            <section className="reading-section">
              <h3 className="reading-section-title" style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px' }}>Your Solution</h3>
              {problem.code ? (
                <CodeBlock code={problem.code} language={problem.language} />
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-page)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>No code solution submitted yet.</p>
                  <Link to={`/problems/${problem._id}/edit`} className="btn btn-secondary btn-sm">
                    Add code solution
                  </Link>
                </div>
              )}
            </section>
          )}

          {activeTab === 'analysis' && (
            <section className="reading-section">
              <h3 className="reading-section-title" style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px' }}>Analysis Report</h3>
              <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: '700', margin: '0 0 8px 0' }}>AlgoMentor DSA Lesson</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                  Explore conceptual problem explanations, progressive hints, code review checks, edge cases, and runtime complexity dry runs.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {normalizedStatus === 'completed' ? (
                    <>
                      <button onClick={handleViewLatest} disabled={actionLoading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: '700' }}>
                        View latest report
                      </button>
                      <button onClick={handleGenerate} disabled={actionLoading} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: '600' }}>
                        Re-analyse problem
                      </button>
                    </>
                  ) : (
                    <button onClick={handleGenerate} disabled={actionLoading} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: '700' }}>
                      Start analysis
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'notes' && (
            <section className="reading-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 className="reading-section-title" style={{ fontSize: '16px', fontWeight: '800', marginBottom: '0' }}>Study Notes & Metadata</h3>
              
              {learningError && <FormError message={learningError} />}
              {learningSuccess && (
                <div style={{ fontSize: '12.5px', color: 'var(--primary)', backgroundColor: 'var(--primary-soft)', padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}>
                  {learningSuccess}
                </div>
              )}

              {/* Private Notes Input */}
              <div className="form-group">
                <label htmlFor="tabNotes" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>Private Study Notes</label>
                <textarea
                  id="tabNotes"
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="Write observations, tricky points, patterns you struggle with, or complexity summaries..."
                  maxLength={5000}
                  rows={6}
                  style={{ width: '100%', fontSize: '13.5px', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Topics Select Grid */}
              <div className="form-group">
                <span style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700' }}>DSA Topics</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {SUPPORTED_TOPICS.map((topic) => {
                    const active = topics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleTopicToggle(topic)}
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          backgroundColor: active ? 'var(--primary-soft)' : 'var(--bg-surface)',
                          color: active ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: active ? '700' : '600'
                        }}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pattern Tags Edit Panel */}
              <div className="form-group">
                <span style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>Pattern Tags</span>
                {patterns.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {patterns.map((p) => (
                      <span
                        key={p}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          backgroundColor: 'var(--bg-soft)',
                          border: '1px solid var(--border)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'capitalize',
                        }}
                      >
                        <span>{p}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePattern(p)}
                          style={{ border: 'none', background: 'none', padding: '0', display: 'inline-flex', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <form onSubmit={handleAddPattern} style={{ display: 'flex', gap: '8px', maxWidth: '320px' }}>
                  <input
                    type="text"
                    placeholder="Add pattern e.g. sliding-window"
                    value={patternInput}
                    onChange={(e) => setPatternInput(e.target.value)}
                    maxLength={100}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0 12px' }}>
                    <Plus size={14} />
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleSaveLearning}
                  disabled={isSavingLearning}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontSize: '13px', fontWeight: '700' }}
                >
                  {isSavingLearning ? 'Saving...' : 'Save study changes'}
                </button>
              </div>
            </section>
          )}

          {activeTab === 'history' && (
            <section className="reading-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
                <h3 className="reading-section-title" style={{ border: 'none', paddingBottom: '0', margin: '0', fontSize: '16px', fontWeight: '800' }}>Analysis History</h3>
                {analyses.length > 1 && (
                  <button
                    type="button"
                    disabled={selectedAttempts.length !== 2}
                    onClick={() => {
                      const sorted = [...selectedAttempts].sort((a, b) => {
                        const firstIdx = analyses.findIndex(x => x._id === a);
                        const secondIdx = analyses.findIndex(x => x._id === b);
                        return secondIdx - firstIdx;
                      });
                      navigate(`/problems/${problemId}/analyses/compare?first=${sorted[0]}&second=${sorted[1]}`);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Compare attempts ({selectedAttempts.length}/2)
                  </button>
                )}
              </div>

              {analysesLoading ? (
                <div style={{ padding: '24px 0' }}>
                  <Loader text="Loading attempts timeline..." />
                </div>
              ) : analyses.length === 0 ? (
                <div className="empty-state-container" style={{ padding: '32px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>No attempts recorded.</p>
                  <button onClick={handleGenerate} className="btn btn-primary btn-sm">
                    Run analysis
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analyses.map((attempt, idx) => {
                    const attemptNum = analyses.length - idx;
                    const reqCount = attempt.requestedSections?.length || 0;
                    const tokenCount = attempt.usage?.totalTokens || 0;

                    return (
                      <div
                        key={attempt._id}
                        className="preview-card-item"
                        style={{
                          padding: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '16px',
                          backgroundColor: 'var(--bg-page)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: selectedAttempts.includes(attempt._id) ? '4px solid var(--primary)' : '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {attempt.status === 'completed' ? (
                            <input
                              type="checkbox"
                              checked={selectedAttempts.includes(attempt._id)}
                              onChange={() => handleToggleSelectAttempt(attempt._id)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          ) : (
                            <input
                              type="checkbox"
                              disabled
                              style={{ cursor: 'not-allowed', width: '16px', height: '16px', opacity: 0.5 }}
                            />
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                Attempt {attemptNum}
                              </strong>
                              <StatusBadge status={attempt.status} />
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} />
                                <span>{new Date(attempt.createdAt).toLocaleDateString()}</span>
                              </span>
                              {attempt.modelName && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Cpu size={12} />
                                  <span>{attempt.modelName}</span>
                                </span>
                              )}
                              <span>{reqCount} modules</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {attempt.status === 'completed' && (
                            <Link to={`/analyses/${attempt._id}`} className="btn btn-secondary btn-sm">
                              Open report
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Summary rail (learning stats card) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <aside className="summary-rail-card" style={{ margin: '0', padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0' }}>Learning Stats</h3>
              <button
                type="button"
                onClick={() => {
                  setIsBookmarked(!isBookmarked);
                  updateProblemLearning(problemId, { isBookmarked: !isBookmarked });
                }}
                className="clear-text-btn"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none' }}
                title="Toggle Bookmark"
              >
                <Star size={18} fill={isBookmarked ? 'var(--warning)' : 'none'} stroke={isBookmarked ? 'var(--warning)' : 'var(--text-muted)'} />
              </button>
            </div>

            <div className="rail-section" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span className="rail-label" style={{ color: 'var(--text-secondary)' }}>Difficulty</span>
              <span className="rail-value" style={{ fontWeight: '700', textTransform: 'uppercase', color: problem.difficulty === 'easy' ? 'var(--primary)' : problem.difficulty === 'medium' ? 'var(--warning-amber)' : 'var(--danger)' }}>
                {problem.difficulty || 'Unknown'}
              </span>
            </div>

            <div className="rail-section" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span className="rail-label" style={{ color: 'var(--text-secondary)' }}>Confidence</span>
              <span className="rail-value" style={{ fontWeight: '700', textTransform: 'capitalize' }}>
                {confidence}
              </span>
            </div>

            <div className="rail-section" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span className="rail-label" style={{ color: 'var(--text-secondary)' }}>Practice Count</span>
              <span className="rail-value" style={{ fontWeight: '700' }}>{problem.practiceCount || 0} times</span>
            </div>

            <div className="rail-section" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span className="rail-label" style={{ color: 'var(--text-secondary)' }}>Last Practiced</span>
              <span className="rail-value" style={{ fontWeight: '700' }}>
                {problem.lastPractisedAt ? new Date(problem.lastPractisedAt).toLocaleDateString() : 'Never'}
              </span>
            </div>

            {/* Revision Date Picker directly inside the stats card */}
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="nextRevision" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Revision Date</label>
              <input
                id="nextRevision"
                type="date"
                value={nextRevisionAt}
                onChange={(e) => {
                  setNextRevisionAt(e.target.value);
                  updateProblemLearning(problemId, { nextRevisionAt: e.target.value ? new Date(e.target.value).toISOString() : null });
                }}
                style={{ fontSize: '13px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to={`/problems/${problem._id}/edit`} className="btn btn-secondary btn-block icon-btn" style={{ padding: '10px', fontSize: '12.5px', fontWeight: '600' }}>
                <Edit3 size={14} />
                <span>Edit problem statement</span>
              </Link>

              {normalizedStatus === 'completed' ? (
                <>
                  <button onClick={handleViewLatest} disabled={actionLoading} className="btn btn-primary btn-block" style={{ padding: '10px', fontSize: '12.5px', fontWeight: '700' }}>
                    <ExternalLink size={14} />
                    <span>View latest analysis</span>
                  </button>
                </>
              ) : (
                <button onClick={handleGenerate} disabled={actionLoading} className="btn btn-primary btn-block" style={{ padding: '10px', fontSize: '12.5px', fontWeight: '700' }}>
                  <Play size={14} />
                  <span>Start analysis</span>
                </button>
              )}
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
export { ProblemDetailPage };
