import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { createProblem, importProblemFromUrl } from '../api/problem.api.js';
import { startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import { useAuth } from '../hooks/useAuth.js';
import FormError from '../components/common/FormError.jsx';
import Loader from '../components/common/Loader.jsx';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import CodeEditor from '../components/common/CodeEditor.jsx';

const SECTIONS_CONFIG = {
  understand: [
    { value: 'problemExplanation', label: 'Simple explanation' },
    { value: 'inputOutput', label: 'Input and output' },
    { value: 'exampleExplanation', label: 'Example walkthrough' },
    { value: 'constraints', label: 'Constraints' },
    { value: 'edgeCases', label: 'Edge cases list' },
    { value: 'missingEdgeCases', label: 'Missing edge cases' },
    { value: 'pattern', label: 'Pattern discovery' },
  ],
  learn: [
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

const ALL_SECTION_KEYS = [
  'problemExplanation',
  'inputOutput',
  'exampleExplanation',
  'constraints',
  'edgeCases',
  'missingEdgeCases',
  'pattern',
  'hints',
  'pseudocode',
  'approaches',
  'approachExplanations',
  'approachImprovement',
  'codes',
  'complexities',
  'dryRun',
  'comparison',
  'userCodeReview',
  'interviewExplanation',
];

const DEFAULT_SECTIONS = [
  'problemExplanation',
  'exampleExplanation',
  'hints',
  'approaches',
  'complexities',
  'interviewExplanation',
];

const NewAnalysisPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const recommendation = location.state || null;

  // Form inputs
  const [title, setTitle] = useState(recommendation?.recommendedTitle || '');
  const [problemStatement, setProblemStatement] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [constraints, setConstraints] = useState(['']);
  const [examples, setExamples] = useState([{ input: '', output: '', explanation: '' }]);
  const [requestedSections, setRequestedSections] = useState(DEFAULT_SECTIONS);
  const [topics, setTopics] = useState(recommendation?.topic ? [recommendation.topic] : []);
  const [patterns, setPatterns] = useState(recommendation?.pattern ? [recommendation.pattern] : []);

  // Metadata inputs
  const [source, setSource] = useState('custom');
  const [sourceUrl, setSourceUrl] = useState('');
  const [externalProblemId, setExternalProblemId] = useState('');
  const [difficulty, setDifficulty] = useState('unknown');

  // Import states
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importWarning, setImportWarning] = useState('');
  const [importedData, setImportedData] = useState(null);

  // Preselect language based on user preferredLanguage preference
  useEffect(() => {
    if (user?.learningPreferences?.preferredLanguage) {
      setLanguage(user.learningPreferences.preferredLanguage);
    }
  }, [user]);

  // Submission / Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [partialFailure, setPartialFailure] = useState(false);

  // Dynamic constraints
  const handleConstraintChange = (index, value) => {
    const updated = [...constraints];
    updated[index] = value;
    setConstraints(updated);
  };

  const addConstraint = () => {
    setConstraints([...constraints, '']);
  };

  const removeConstraint = (index) => {
    const updated = constraints.filter((_, i) => i !== index);
    setConstraints(updated.length > 0 ? updated : ['']);
  };

  // Dynamic examples
  const handleExampleChange = (index, field, value) => {
    const updated = [...examples];
    updated[index][field] = value;
    setExamples(updated);
  };

  const addExample = () => {
    setExamples([...examples, { input: '', output: '', explanation: '' }]);
  };

  const removeExample = (index) => {
    const updated = examples.filter((_, i) => i !== index);
    setExamples(updated.length > 0 ? updated : [{ input: '', output: '', explanation: '' }]);
  };

  const handleImport = async () => {
    if (!importUrl || importUrl.trim() === '') {
      setImportError('Please enter a valid URL.');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportWarning('');
    setImportedData(null);

    try {
      const data = await importProblemFromUrl(importUrl.trim());
      if (data) {
        setImportedData(data);
        if (data.partialImport) {
          setImportWarning(data.warning || 'We detected the problem, but could not import the full content. Please paste the problem statement manually.');
        }
      }
    } catch (err) {
      setImportError(err.response?.data?.message || 'Failed to import problem from URL. Please check the URL and try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleUseImport = () => {
    if (!importedData) return;
    setTitle(importedData.title || '');
    setProblemStatement(importedData.problemStatement || '');
    setDifficulty(importedData.difficulty || 'unknown');
    setSource(importedData.source || 'custom');
    setSourceUrl(importedData.sourceUrl || '');
    setExternalProblemId(importedData.externalProblemId || '');
    
    if (importedData.constraints && importedData.constraints.length > 0) {
      setConstraints(importedData.constraints);
    }
    
    if (importedData.examples && importedData.examples.length > 0) {
      setExamples(importedData.examples);
    }
    
    if (importedData.topics && importedData.topics.length > 0) {
      setTopics(importedData.topics);
    }

    setImportWarning(importedData.partialImport ? (importedData.warning || 'We detected the problem, but could not import the full content. Please paste the problem statement manually.') : '');
    setImportedData(null);
    setImportUrl('');
  };

  const handleClearImport = () => {
    setImportedData(null);
    setImportUrl('');
    setImportError('');
    setImportWarning('');
  };

  // Checkbox handling
  const handleSectionChange = (sectionValue) => {
    if (requestedSections.includes(sectionValue)) {
      setRequestedSections(requestedSections.filter((val) => val !== sectionValue));
    } else {
      setRequestedSections([...requestedSections, sectionValue]);
    }
  };

  // Preset shortcuts
  const applyPreset = (presetType) => {
    switch (presetType) {
      case 'quickHelp':
        setRequestedSections(['problemExplanation', 'pattern', 'hints']);
        break;
      case 'learnFully':
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
        break;
      case 'improveSolution':
        setRequestedSections(['userCodeReview', 'missingEdgeCases', 'approachImprovement', 'complexities']);
        if (!code.trim()) {
          alert('Code implementation is required for the "Improve my solution" preset.');
        }
        break;
      case 'interviewPrep':
        setRequestedSections(['pattern', 'approaches', 'complexities', 'comparison', 'interviewExplanation']);
        break;
      default:
        break;
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!title.trim() || title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }
    if (!problemStatement.trim() || problemStatement.trim().length < 10) {
      errors.problemStatement = 'Description must be at least 10 characters';
    }
    if (requestedSections.length === 0) {
      errors.sections = 'At least one section must be selected';
    }
    if (requestedSections.includes('userCodeReview') && (!code || code.trim().length === 0)) {
      errors.code = 'Your code is required for the review module';
    }

    const hasIncompleteExamples = examples.some(
      (ex) =>
        (ex.input.trim() || ex.output.trim() || ex.explanation.trim()) &&
        (!ex.input.trim() || !ex.output.trim())
    );
    if (hasIncompleteExamples) {
      errors.examples = 'Each customized example must include both input and output values';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setPartialFailure(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    let problemId = null;

    const cleanConstraints = constraints
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const cleanExamples = examples
      .filter((ex) => ex.input.trim() !== '' && ex.output.trim() !== '')
      .map((ex) => ({
        input: ex.input.trim(),
        output: ex.output.trim(),
        explanation: ex.explanation.trim(),
      }));

    try {
      // 1. Create Problem
      const problem = await createProblem({
        title: title.trim(),
        problemStatement: problemStatement.trim(),
        language,
        code: code.trim(),
        constraints: cleanConstraints,
        examples: cleanExamples,
        requestedSections,
        topics,
        patterns,
        source,
        sourceUrl,
        externalProblemId,
        difficulty,
        recommendationKey: recommendation?.recommendationKey,
      });

      problemId = problem._id;

      // 2. start analysis
      const analysis = await startProblemAnalysis(problemId);

      // 3. navigate to results
      navigate(`/analyses/${analysis._id}`);
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.data?.existingProblem) {
        const existing = error.response.data.data.existingProblem;
        setGeneralError(`You have already saved this problem as "${existing.title}". Redirecting to it...`);
        setTimeout(() => {
          navigate(`/problems/${existing._id}`);
        }, 3000);
        return;
      }

      const errMsg = getApiErrorMessage(error);
      setGeneralError(errMsg);
      if (problemId) {
        setPartialFailure(true);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-analysis-container">
      {/* Visual Submission Overlay Screen */}
      {isSubmitting && (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <Loader text="Building your analysis" />
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="progress-step active" style={{ justifyContent: 'center' }}>
                • Understanding the problem
              </span>
              <span className="progress-step active" style={{ justifyContent: 'center' }}>
                • Identifying patterns
              </span>
              <span className="progress-step active" style={{ justifyContent: 'center' }}>
                • Comparing approaches
              </span>
              <span className="progress-step active" style={{ justifyContent: 'center' }}>
                • Preparing your explanation
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Page Header & Progress indicator */}
      <header className="workspace-page-header">
        <div>
          <h1 className="page-title">Analyse a problem</h1>
          <p className="page-subtitle">Build a personalised explanation from the question you are working on.</p>
        </div>
        
        <div className="workspace-progress-indicator">
          <span className="progress-step active">1. Problem</span>
          <span className="progress-step active">2. Learning options</span>
          <span className="progress-step">3. Analysis</span>
        </div>
      </header>

      {partialFailure && (
        <div className="partial-failure-alert" role="alert" style={{ marginBottom: '24px' }}>
          <p>
            <strong>Problem saved, but analysis generation failed.</strong>
          </p>
          <p>
            You can trigger the analysis generator again from the{' '}
            <Link to="/problems" className="alert-link">
              My problems
            </Link>{' '}
            workspace library.
          </p>
        </div>
      )}

      {generalError && <FormError message={generalError} />}

      <form onSubmit={handleSubmit} className="new-analysis-workspace">
        {/* Left Column: Problem Editor Fields */}
        <div className="workspace-left-col">
          {recommendation && (
            <div className="say-in-interview-callout" style={{ marginBottom: '20px', borderLeftColor: 'var(--ai-accent)', backgroundColor: 'var(--ai-soft)' }}>
              <span className="callout-title" style={{ color: 'var(--ai-accent)', fontWeight: '700' }}>Recommended practice</span>
              <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                Prefilled details for: <strong>{recommendation.recommendedTitle || recommendation.pattern}</strong>. 
                Please paste or write the full problem statement and examples below before generating your analysis.
              </p>
            </div>
          )}

          {/* Import from Problem Link Section */}
          <div className="import-section-card">
            <h3 className="import-section-title">Import from problem link</h3>
            <div className="import-input-row">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste LeetCode or GeeksforGeeks HTTPS problem URL here..."
                disabled={importLoading || isSubmitting}
              />
              <button
                type="button"
                onClick={handleImport}
                disabled={importLoading || isSubmitting}
                className="btn btn-primary"
                style={{ padding: '10px 20px', minWidth: '100px' }}
              >
                {importLoading ? 'Importing...' : 'Import'}
              </button>
            </div>

            <div className="import-platforms">
              <span>Supported platforms:</span>
              <span className="platform-badge">LeetCode</span>
              <span className="platform-badge">GeeksforGeeks</span>
            </div>

            {importError && (
              <div className="alert alert-error" style={{ marginTop: '12px', marginBottom: 0 }}>
                <AlertCircle size={16} />
                <span>{importError}</span>
              </div>
            )}

            {importWarning && (
              <div className="alert alert-warning" style={{ marginTop: '12px', marginBottom: 0 }}>
                <AlertCircle size={16} />
                <span>{importWarning}</span>
              </div>
            )}

            {importedData && (
              <div style={{ marginTop: '16px', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-soft)' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Import Preview</h4>
                <p style={{ fontSize: '0.85rem' }}>Title: <strong>{importedData.title}</strong> ({importedData.difficulty})</p>
                <div className="import-actions-row">
                  <button
                    type="button"
                    onClick={handleClearImport}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  >
                    Clear Import
                  </button>
                  <button
                    type="button"
                    onClick={handleUseImport}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  >
                    Use Imported Problem
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 1: Problem */}
          <div className="editor-card">
            <h3 className="editor-card-title">Problem</h3>
            
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Two Sum"
                disabled={isSubmitting}
              />
              {validationErrors.title && (
                <span className="field-error">{validationErrors.title}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="problemStatement">Problem Statement *</label>
              <textarea
                id="problemStatement"
                rows={6}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Paste the problem statement description here..."
                disabled={isSubmitting}
              />
              {validationErrors.problemStatement && (
                <span className="field-error">{validationErrors.problemStatement}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="c">C</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
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

              <div className="form-group" style={{ flex: 1 }}>
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

            <div className="form-row" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="sourceUrl">Source URL</label>
                <input
                  id="sourceUrl"
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://leetcode.com/problems/..."
                  disabled={isSubmitting}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="externalProblemId">External ID (Slug)</label>
                <input
                  id="externalProblemId"
                  type="text"
                  value={externalProblemId}
                  onChange={(e) => setExternalProblemId(e.target.value)}
                  placeholder="e.g. two-sum"
                  disabled={isSubmitting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Examples and constraints */}
          <div className="editor-card">
            <div className="editor-card-header">
              <h3 className="editor-card-title">Examples and constraints</h3>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Constraints</label>
                <button
                  type="button"
                  onClick={addConstraint}
                  disabled={isSubmitting}
                  className="clear-text-btn"
                  style={{ padding: 0 }}
                >
                  + Add constraint
                </button>
              </div>

              <div className="dynamic-row-list">
                {constraints.map((c, idx) => (
                  <div key={idx} className="dynamic-row-item">
                    <input
                      type="text"
                      value={c}
                      onChange={(e) => handleConstraintChange(idx, e.target.value)}
                      placeholder="e.g. 1 <= nums.length <= 10^4"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => removeConstraint(idx)}
                      disabled={isSubmitting}
                      className="row-action-btn"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Examples</label>
                <button
                  type="button"
                  onClick={addExample}
                  disabled={isSubmitting}
                  className="clear-text-btn"
                  style={{ padding: 0 }}
                >
                  + Add example
                </button>
              </div>

              {validationErrors.examples && (
                <div className="field-error" style={{ marginBottom: '8px' }}>
                  {validationErrors.examples}
                </div>
              )}

              <div className="examples-edit-grid">
                {examples.map((ex, idx) => (
                  <div key={idx} className="example-edit-item">
                    <div className="example-edit-header">
                      <span>Example {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeExample(idx)}
                        disabled={isSubmitting}
                        className="row-action-btn"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="example-edit-body">
                      <input
                        type="text"
                        value={ex.input}
                        onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                        placeholder="Input: nums = [2,7], target = 9"
                        disabled={isSubmitting}
                      />
                      <input
                        type="text"
                        value={ex.output}
                        onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                        placeholder="Output: [0,1]"
                        disabled={isSubmitting}
                      />
                      <textarea
                        rows={1}
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

          {/* Section 3: Your code (Monaco Editor style) */}
          <div className="editor-card" style={{ padding: '24px 0' }}>
            <div style={{ padding: '0 24px' }}>
              <h3 className="editor-card-title">Your code</h3>
            </div>

            <div className="form-group" style={{ padding: '0 24px', marginTop: '12px' }}>
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
        </div>

        {/* Right Column: Sticky build settings panel */}
        <div className="workspace-right-col">
          <div className="options-sticky-card">
            <header className="options-title-block">
              <h3 className="options-title">Build your learning path</h3>
              <p className="options-subtitle">Choose only what you need right now.</p>
            </header>

            {/* Presets Row */}
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

            {validationErrors.sections && (
              <div className="field-error">{validationErrors.sections}</div>
            )}

            <div className="options-group">
              <h4 className="options-group-title">Understand</h4>
              <div className="options-checkbox-list">
                {SECTIONS_CONFIG.understand.map((sec) => (
                  <label key={sec.value} className="checkbox-chip-label">
                    <input
                      type="checkbox"
                      checked={requestedSections.includes(sec.value)}
                      onChange={() => handleSectionChange(sec.value)}
                      disabled={isSubmitting}
                    />
                    <span>{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="options-group">
              <h4 className="options-group-title">Solve</h4>
              <div className="options-checkbox-list">
                {SECTIONS_CONFIG.learn.map((sec) => {
                  const isAI = sec.value === 'approachImprovement';
                  return (
                    <label key={sec.value} className="checkbox-chip-label">
                      <input
                        type="checkbox"
                        checked={requestedSections.includes(sec.value)}
                        onChange={() => handleSectionChange(sec.value)}
                        disabled={isSubmitting}
                      />
                      <span style={isAI ? { color: 'var(--ai-accent)', fontWeight: '600' } : {}}>
                        {sec.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="options-group">
              <h4 className="options-group-title">Prepare</h4>
              <div className="options-checkbox-list">
                {SECTIONS_CONFIG.prepare.map((sec) => (
                  <label key={sec.value} className="checkbox-chip-label">
                    <input
                      type="checkbox"
                      checked={requestedSections.includes(sec.value)}
                      onChange={() => handleSectionChange(sec.value)}
                      disabled={isSubmitting}
                    />
                    <span>{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="options-actions-block">
              <div className="selected-count-label" style={{ fontWeight: '600' }}>
                {requestedSections.length} sections selected
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-block"
              >
                Generate analysis
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', display: 'block', marginTop: '4px' }}>
                Your problem is saved before analysis begins.
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewAnalysisPage;
export { NewAnalysisPage };
