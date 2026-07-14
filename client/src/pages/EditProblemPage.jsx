import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProblemById, updateProblem } from '../api/problem.api.js';
import { startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import FormError from '../components/common/FormError.jsx';
import Loader from '../components/common/Loader.jsx';
import CodeEditor from '../components/common/CodeEditor.jsx';
import { Plus, Trash2, ArrowLeft, Save, Play } from 'lucide-react';

const SECTIONS_CONFIG = {
  understand: [
    { value: 'problemExplanation', label: 'Simple explanation' },
    { value: 'inputOutput', label: 'Input and output' },
    { value: 'exampleExplanation', label: 'Example walkthrough' },
    { value: 'constraints', label: 'Constraints implications' },
    { value: 'edgeCases', label: 'Edge cases list' },
    { value: 'missingEdgeCases', label: 'Missing edge cases' },
    { value: 'pattern', label: 'Pattern discovery' },
  ],
  solve: [
    { value: 'hints', label: 'Progressive hints' },
    { value: 'pseudocode', label: 'Pseudocode outline' },
    { value: 'approaches', label: 'All approaches' },
    { value: 'approachExplanations', label: 'Approach explanations' },
    { value: 'approachImprovement', label: 'Improve my approach' },
    { value: 'codes', label: 'Reference code solutions' },
    { value: 'complexities', label: 'Complexity boundaries' },
    { value: 'dryRun', label: 'Optimal dry run trace' },
    { value: 'comparison', label: 'Compare solutions' },
  ],
  prepare: [
    { value: 'userCodeReview', label: 'Review my code' },
    { value: 'interviewExplanation', label: 'Interview answer guide' },
  ],
};

const EditProblemPage = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [constraints, setConstraints] = useState([]);
  const [examples, setExamples] = useState([]);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [requestedSections, setRequestedSections] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Metadata State
  const [source, setSource] = useState('custom');
  const [sourceUrl, setSourceUrl] = useState('');
  const [externalProblemId, setExternalProblemId] = useState('');
  const [difficulty, setDifficulty] = useState('unknown');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      setIsLoading(true);
      setError('');
      try {
        const problem = await getProblemById(problemId);
        setTitle(problem.title || '');
        setProblemStatement(problem.problemStatement || '');
        setConstraints(problem.constraints || []);
        setExamples(problem.examples || []);
        setLanguage(problem.language || 'cpp');
        setCode(problem.code || '');
        setRequestedSections(problem.requestedSections || []);
        setSource(problem.source || 'custom');
        setSourceUrl(problem.sourceUrl || '');
        setExternalProblemId(problem.externalProblemId || '');
        setDifficulty(problem.difficulty || 'unknown');
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchProblem();
  }, [problemId]);

  const handleAddConstraint = () => {
    setConstraints((prev) => [...prev, '']);
  };

  const handleConstraintChange = (idx, value) => {
    setConstraints((prev) => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  const handleRemoveConstraint = (idx) => {
    setConstraints((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddExample = () => {
    setExamples((prev) => [...prev, { input: '', output: '', explanation: '' }]);
  };

  const handleExampleChange = (idx, key, value) => {
    setExamples((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  const handleRemoveExample = (idx) => {
    setExamples((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSectionToggle = (sectionVal) => {
    setRequestedSections((prev) => {
      if (prev.includes(sectionVal)) {
        return prev.filter((item) => item !== sectionVal);
      } else {
        return [...prev, sectionVal];
      }
    });
  };

  const applyPreset = (presetName) => {
    if (presetName === 'quickHelp') {
      setRequestedSections(['problemExplanation', 'pattern', 'hints']);
    } else if (presetName === 'learnFully') {
      setRequestedSections([
        'problemExplanation',
        'exampleExplanation',
        'constraints',
        'edgeCases',
        'missingEdgeCases',
        'pattern',
        'hints',
        'approaches',
        'approachExplanations',
        'approachImprovement',
        'complexities',
        'dryRun',
        'comparison',
      ]);
    } else if (presetName === 'improveSolution') {
      setRequestedSections(['userCodeReview', 'missingEdgeCases', 'approachImprovement', 'complexities']);
      if (!code.trim()) {
        alert('Code implementation is required for the "Improve my solution" preset.');
      }
    } else if (presetName === 'interviewPrep') {
      setRequestedSections(['pattern', 'approaches', 'complexities', 'comparison', 'interviewExplanation']);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!title.trim()) errors.title = 'Title is required';
    if (!problemStatement.trim()) errors.problemStatement = 'Problem statement is required';
    if (requestedSections.length === 0) errors.sections = 'Select at least one analysis module';
    if (requestedSections.includes('userCodeReview') && !code.trim()) {
      errors.code = 'Code is required when "Review my code" is selected';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getPayload = () => {
    return {
      title: title.trim(),
      problemStatement: problemStatement.trim(),
      constraints: constraints.map((c) => c.trim()).filter((c) => c !== ''),
      examples: examples
        .map((ex) => ({
          input: ex.input.trim(),
          output: ex.output.trim(),
          explanation: ex.explanation.trim(),
        }))
        .filter((ex) => ex.input !== '' || ex.output !== ''),
      language,
      code,
      requestedSections,
      source,
      sourceUrl,
      externalProblemId,
      difficulty,
    };
  };

  const handleSaveOnly = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await updateProblem(problemId, getPayload());
      setSuccess('Problem updated successfully.');
      setTimeout(() => {
        navigate(`/problems/${problemId}`);
      }, 1200);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndRegenerate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    let updated = false;
    try {
      await updateProblem(problemId, getPayload());
      updated = true;
    } catch (err) {
      setError(getApiErrorMessage(err));
      setIsSubmitting(false);
      return;
    }

    if (updated) {
      try {
        const analysis = await startProblemAnalysis(problemId);
        navigate(`/analyses/${analysis._id}`);
      } catch (err) {
        setError('Changes saved, but analysis generation failed. You can try again from this problem.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="loader-container">
        <Loader text="Loading problem draft..." />
      </div>
    );
  }

  return (
    <div className="new-analysis-workspace container" style={{ paddingBottom: '80px', paddingTop: '16px' }}>
      {isSubmitting && (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <Loader text="Saving modifications..." />
          </div>
        </div>
      )}

      {/* Left Column: Form Draft inputs */}
      <div className="workspace-left-col">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '16px',
            marginBottom: '16px',
          }}
        >
          <Link to={`/problems/${problemId}`} className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
            <ArrowLeft size={14} /> Back to details
          </Link>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status resets to Draft on edit</span>
        </div>

        <header style={{ marginBottom: '24px' }}>
          <h1 className="welcome-title" style={{ fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Edit problem draft</h1>
          <p className="welcome-subtitle">Refine description, examples, or code implementation details.</p>
        </header>

        {success && <div className="form-success" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>{success}</div>}
        <FormError message={error} />

        <form className="auth-form" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Area: Core specifications */}
          <div className="editor-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="title" style={{ fontWeight: '700' }}>Problem Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Binary Tree Zigzag Level Order Traversal"
                disabled={isSubmitting}
              />
              {validationErrors.title && <span className="field-error">{validationErrors.title}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="problemStatement" style={{ fontWeight: '700' }}>Problem Statement</label>
              <textarea
                id="problemStatement"
                rows={8}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Paste the problem description or requirements..."
                disabled={isSubmitting}
                style={{ fontSize: '13.5px', lineHeight: '1.5' }}
              />
              {validationErrors.problemStatement && (
                <span className="field-error">{validationErrors.problemStatement}</span>
              )}
            </div>

            {/* Language and Code Editor */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="code" style={{ margin: 0, fontWeight: '700' }}>Code Solution (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="language" style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Language:</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isSubmitting}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '12.5px', height: '30px' }}
                  >
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="c">C</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                disabled={isSubmitting}
                isCodeReviewSelected={requestedSections.includes('userCodeReview')}
              />
              {validationErrors.code && (
                <span className="field-error" style={{ margin: '8px 4px 0 4px', display: 'block' }}>
                  {validationErrors.code}
                </span>
              )}
            </div>
          </div>

          {/* Collapsible Optional details */}
          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <span>Optional details (source, difficulty, constraints, examples)</span>
              <span>{showOptionalDetails ? '▲ Hide' : '▼ Expand'}</span>
            </button>

            {showOptionalDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderTop: 'none', borderBottomLeftRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)' }}>
                
                {/* Source & Difficulty */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                    <label htmlFor="source">Source</label>
                    <select
                      id="source"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="custom">Custom</option>
                      <option value="leetcode">LeetCode</option>
                      <option value="gfg">GeeksforGeeks</option>
                      <option value="code360">Code360</option>
                      <option value="codeforces">Codeforces</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                    <label htmlFor="difficulty">Difficulty</label>
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Source URL & External ID */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                    <label htmlFor="sourceUrl">Source URL</label>
                    <input
                      id="sourceUrl"
                      type="text"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://leetcode.com/problems/..."
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                    <label htmlFor="externalProblemId">External ID (Slug)</label>
                    <input
                      id="externalProblemId"
                      type="text"
                      value={externalProblemId}
                      onChange={(e) => setExternalProblemId(e.target.value)}
                      placeholder="e.g. two-sum"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Constraints */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontWeight: '700', fontSize: '13px' }}>Constraints</label>
                    <button
                      type="button"
                      onClick={handleAddConstraint}
                      disabled={isSubmitting}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '11.5px' }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {constraints.length === 0 && (
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No constraints added.</span>
                    )}
                    {constraints.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => handleConstraintChange(idx, e.target.value)}
                          placeholder="e.g. 1 <= nums.length <= 10^4"
                          disabled={isSubmitting}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveConstraint(idx)}
                          disabled={isSubmitting}
                          className="list-action-icon-btn danger"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Examples */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontWeight: '700', fontSize: '13px' }}>Examples</label>
                    <button
                      type="button"
                      onClick={handleAddExample}
                      disabled={isSubmitting}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '11.5px' }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {examples.length === 0 && (
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No examples added.</span>
                    )}
                    {examples.map((ex, idx) => (
                      <div key={idx} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-page)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>Example {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExample(idx)}
                            disabled={isSubmitting}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={ex.input}
                            onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                            placeholder="Input..."
                            disabled={isSubmitting}
                          />
                          <input
                            type="text"
                            value={ex.output}
                            onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                            placeholder="Output..."
                            disabled={isSubmitting}
                          />
                          <textarea
                            rows={2}
                            value={ex.explanation}
                            onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                            placeholder="Explanation..."
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Action Buttons: Save Changes (Primary), Save and Analyse (Secondary) */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px 24px', fontSize: '13.5px', fontWeight: '700' }}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleSaveAndRegenerate}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '12px 24px', fontSize: '13.5px', fontWeight: '600' }}
            >
              Save and Analyse Again
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Sticky Option selections */}
      <div className="workspace-right-col">
        <div className="options-sticky-card">
          <header className="options-title-block">
            <h3 className="options-title">Build learning path</h3>
            <p className="options-subtitle">Choose requested analysis sections.</p>
          </header>

          <div className="presets-row">
            <button type="button" onClick={() => applyPreset('quickHelp')} className="preset-chip-btn">
              Quick help
            </button>
            <button type="button" onClick={() => applyPreset('learnFully')} className="preset-chip-btn">
              Learn fully
            </button>
            <button type="button" onClick={() => applyPreset('improveSolution')} className="preset-chip-btn">
              Improve solution
            </button>
            <button type="button" onClick={() => applyPreset('interviewPrep')} className="preset-chip-btn">
              Interview prep
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

          <div className="options-group">
            <span className="options-group-title">Understand</span>
            <div className="options-checkbox-list">
              {SECTIONS_CONFIG.understand.map((item) => (
                <label key={item.value} className="checkbox-chip-label">
                  <input
                    type="checkbox"
                    checked={requestedSections.includes(item.value)}
                    onChange={() => handleSectionToggle(item.value)}
                    disabled={isSubmitting}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="options-group">
            <span className="options-group-title">Solve & Improve</span>
            <div className="options-checkbox-list">
              {SECTIONS_CONFIG.solve.map((item) => {
                const isAI = item.value === 'approachImprovement';
                return (
                  <label key={item.value} className="checkbox-chip-label">
                    <input
                      type="checkbox"
                      checked={requestedSections.includes(item.value)}
                      onChange={() => handleSectionToggle(item.value)}
                      disabled={isSubmitting}
                    />
                    <span style={isAI ? { color: 'var(--ai-accent)', fontWeight: '600' } : {}}>
                      {item.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="options-group">
            <span className="options-group-title">Prepare</span>
            <div className="options-checkbox-list">
              {SECTIONS_CONFIG.prepare.map((item) => (
                <label key={item.value} className="checkbox-chip-label">
                  <input
                    type="checkbox"
                    checked={requestedSections.includes(item.value)}
                    onChange={() => handleSectionToggle(item.value)}
                    disabled={isSubmitting}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {validationErrors.sections && <span className="field-error">{validationErrors.sections}</span>}

          <div className="options-actions-block" style={{ marginTop: '16px' }}>
            <span className="selected-count-label" style={{ display: 'block', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              {requestedSections.length} modules selected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProblemPage;
export { EditProblemPage };
