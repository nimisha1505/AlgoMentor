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

  // Input states & UI switches
  const [inputMode, setInputMode] = useState('paste'); // 'paste' or 'import'
  const [successMessage, setSuccessMessage] = useState('');

  // Import states
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importWarning, setImportWarning] = useState('');

  // Preselect language based on user preferredLanguage preference
  useEffect(() => {
    if (user?.learningPreferences?.preferredLanguage) {
      setLanguage(user.learningPreferences.preferredLanguage);
    }
  }, [user]);

  const [learningMode, setLearningMode] = useState('understand');
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  // Sync mode choices to requestedSections when customiseOpen is false
  useEffect(() => {
    if (!customiseOpen) {
      if (learningMode === 'understand') {
        setRequestedSections([
          'problemExplanation',
          'inputOutput',
          'exampleExplanation',
          'constraints',
          'edgeCases',
          'pattern',
        ]);
      } else if (learningMode === 'hints') {
        setRequestedSections([
          'problemExplanation',
          'pattern',
          'hints',
          'edgeCases',
        ]);
      } else if (learningMode === 'review') {
        setRequestedSections([
          'userCodeReview',
          'missingEdgeCases',
          'approachImprovement',
          'complexities',
        ]);
      }
    }
  }, [learningMode, customiseOpen]);

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
    setSuccessMessage('');

    try {
      const data = await importProblemFromUrl(importUrl.trim());
      if (data) {
        setTitle(data.title || '');
        setProblemStatement(data.problemStatement || '');
        setDifficulty(data.difficulty || 'unknown');
        setSource(data.source || 'custom');
        setSourceUrl(data.sourceUrl || '');
        setExternalProblemId(data.externalProblemId || '');
        
        if (data.constraints && data.constraints.length > 0) {
          setConstraints(data.constraints);
        }
        
        if (data.examples && data.examples.length > 0) {
          setExamples(data.examples);
        }
        
        if (data.topics && data.topics.length > 0) {
          setTopics(data.topics);
        }
        
        if (data.patterns && data.patterns.length > 0) {
          setPatterns(data.patterns);
        }

        if (data.partialImport) {
          setImportWarning(data.warning || 'We imported the available details. Please complete the problem statement before continuing.');
        } else {
          setSuccessMessage(`Successfully imported: ${data.title || 'Problem details'}. You can now edit the problem details or continue to customize below.`);
        }
        
        // Auto-switch tab to Paste Problem so they can edit it
        setInputMode('paste');
      }
    } catch (err) {
      setImportError(err.response?.data?.message || 'Failed to import problem from URL. Please check the URL and try again.');
    } finally {
      setImportLoading(false);
    }
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
    
    let resolvedTitle = title.trim();
    if (!resolvedTitle && problemStatement.trim().length >= 10) {
      const firstLine = problemStatement.trim().split('\n')[0];
      resolvedTitle = firstLine.substring(0, 80) || 'Untitled Problem';
      setTitle(resolvedTitle);
    }

    if (!resolvedTitle) {
      errors.title = 'Title is required or enter problem description to auto-generate';
    } else if (resolvedTitle.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!problemStatement.trim() || problemStatement.trim().length < 10) {
      errors.problemStatement = 'Description must be at least 10 characters';
    }
    if (requestedSections.length === 0) {
      errors.sections = 'At least one section must be selected';
    }
    if (learningMode === 'review' && (!code || code.trim().length === 0)) {
      errors.code = 'Add your code so AlgoMentor can review it.';
    } else if (requestedSections.includes('userCodeReview') && (!code || code.trim().length === 0)) {
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

    let resolvedTitle = title.trim();
    if (!resolvedTitle && problemStatement.trim().length >= 10) {
      const firstLine = problemStatement.trim().split('\n')[0];
      resolvedTitle = firstLine.substring(0, 80) || 'Untitled Problem';
      setTitle(resolvedTitle);
    }

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
        title: resolvedTitle,
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

      {/* Top Page Header */}
      <header className="workspace-page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E3E8E6',
                fontWeight: '600'
              }}
            >
              ← Back
            </button>
            <h1 className="page-title" style={{ fontSize: '30px', fontWeight: '800', color: '#17212B', margin: 0 }}>
              What are you working on?
            </h1>
          </div>
          <p className="page-subtitle" style={{ color: '#667085', fontSize: '15px', margin: 0 }}>
            Paste a DSA problem, add your code if you have one, and choose how you want to learn.
          </p>
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
            <div className="say-in-interview-callout" style={{ borderLeftColor: 'var(--ai-accent)', backgroundColor: 'var(--ai-soft)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <span className="callout-title" style={{ color: 'var(--ai-accent)', fontWeight: '700' }}>Recommended practice</span>
              <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                Prefilled details for: <strong>{recommendation.recommendedTitle || recommendation.pattern}</strong>. 
                Please paste or write the full problem statement and examples below before generating your analysis.
              </p>
            </div>
          )}

          {/* Main workspace card */}
          <div className="main-workspace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E3E8E6', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#17212B', margin: 0 }}>Add your problem</h3>
              
              {/* Connected tabs input mode switch */}
              <div className="input-mode-switch">
                <button
                  type="button"
                  className={`mode-switch-btn ${inputMode === 'paste' ? 'active' : ''}`}
                  onClick={() => setInputMode('paste')}
                >
                  Paste Problem
                </button>
                <button
                  type="button"
                  className={`mode-switch-btn ${inputMode === 'import' ? 'active' : ''}`}
                  onClick={() => setInputMode('import')}
                >
                  Import Link
                </button>
              </div>
            </div>

            {/* Banners */}
            {successMessage && (
              <div className="alert alert-success" style={{ marginBottom: '16px', padding: '10px 16px', backgroundColor: '#EAF7F1', color: '#168B62', borderRadius: '8px', border: '1px solid #E3E8E6', fontSize: '13px' }}>
                <span>{successMessage}</span>
              </div>
            )}

            {importWarning && (
              <div className="alert alert-warning" style={{ marginBottom: '16px', padding: '10px 16px', backgroundColor: '#FFF7E6', color: '#B7791F', borderRadius: '8px', border: '1px solid #E3E8E6', fontSize: '13px' }}>
                <span>{importWarning}</span>
              </div>
            )}

            {importError && (
              <div className="alert alert-error" style={{ marginBottom: '16px', padding: '10px 16px', backgroundColor: '#FFF0F1', color: '#C73E4D', borderRadius: '8px', border: '1px solid #F3B8BF', fontSize: '13px' }}>
                <span>{importError}</span>
              </div>
            )}

            {/* Import Link Mode view */}
            {inputMode === 'import' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="Paste LeetCode or GeeksforGeeks HTTPS problem URL here..."
                    disabled={importLoading || isSubmitting}
                    style={{ flex: 1, padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', backgroundColor: '#F5F7F6', fontSize: '14px' }}
                  />
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importLoading || isSubmitting}
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', height: '42px', minWidth: '110px', fontSize: '14px', fontWeight: '700', borderRadius: '8px' }}
                  >
                    {importLoading ? 'Importing...' : 'Import'}
                  </button>
                </div>

                <div className="import-platforms" style={{ fontSize: '12px', color: '#667085', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>Supported platforms:</span>
                  <span className="platform-badge" style={{ backgroundColor: '#F5F7F6', padding: '3px 10px', borderRadius: '12px', border: '1px solid #E3E8E6', fontWeight: '600' }}>LeetCode</span>
                  <span className="platform-badge" style={{ backgroundColor: '#F5F7F6', padding: '3px 10px', borderRadius: '12px', border: '1px solid #E3E8E6', fontWeight: '600' }}>GeeksforGeeks</span>
                </div>
              </div>
            )}

            {/* Paste Problem Mode view */}
            {inputMode === 'paste' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <label htmlFor="problemStatement" style={{ fontSize: '14px', fontWeight: '600', color: '#17212B' }}>Problem statement</label>
                  <span style={{ fontSize: '12px', color: '#667085' }}>Paste the complete statement, including examples and constraints if available.</span>
                </div>
                <textarea
                  id="problemStatement"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder={`Example:\nGiven an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].`}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    padding: '16px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    borderRadius: '8px',
                    border: '1px solid #E3E8E6',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    resize: 'vertical',
                  }}
                />
                {validationErrors.problemStatement && (
                  <span className="field-error" style={{ color: 'var(--danger)', fontSize: '12.5px', marginTop: '4px', display: 'block' }}>{validationErrors.problemStatement}</span>
                )}
              </div>
            )}
          </div>

          {/* Code Workspace Card */}
          <div className="main-workspace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#17212B', margin: 0 }}>
                Your solution <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#667085' }}>(Optional)</span>
              </h3>
              
              {/* Programming Language selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#667085' }}>Language:</span>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E3E8E6',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    fontWeight: '600'
                  }}
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

            <p style={{ fontSize: '13px', color: '#667085', margin: '0 0 16px 0' }}>
              Add your code for review, or leave it empty if you only want help understanding the problem.
            </p>

            <div className="monaco-editor-frame">
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                disabled={isSubmitting}
                isCodeReviewSelected={requestedSections.includes('userCodeReview')}
              />
            </div>
            {validationErrors.code && (
              <span className="field-error" style={{ margin: '8px 4px 0 4px', display: 'block', color: 'var(--danger)', fontSize: '12.5px' }}>
                {validationErrors.code}
              </span>
            )}
          </div>

          {/* Optional details collapsed accordion */}
          <div className="optional-details-accordion" style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => setOptionalOpen(!optionalOpen)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E3E8E6',
                borderRadius: '14px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#17212B',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <span>Optional problem details</span>
              <span>{optionalOpen ? '▲' : '▼'}</span>
            </button>

            {optionalOpen && (
              <div
                style={{
                  padding: '24px',
                  border: '1px solid #E3E8E6',
                  borderTop: 'none',
                  borderBottomLeftRadius: '14px',
                  borderBottomRightRadius: '14px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  marginTop: '-8px'
                }}
              >
                <div className="form-group">
                  <label htmlFor="title" style={{ fontSize: '13px', fontWeight: '600', color: '#17212B', marginBottom: '6px', display: 'block' }}>Title (Optional)</label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Two Sum (Auto-generated if blank)"
                    disabled={isSubmitting}
                    style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%' }}
                  />
                  {validationErrors.title && (
                    <span className="field-error" style={{ color: 'var(--danger)', fontSize: '12.5px' }}>{validationErrors.title}</span>
                  )}
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="source" style={{ fontSize: '13px', fontWeight: '600', color: '#17212B', marginBottom: '6px', display: 'block' }}>Source</label>
                    <select
                      id="source"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      disabled={isSubmitting}
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="custom">Custom</option>
                      <option value="leetcode">LeetCode</option>
                      <option value="gfg">GeeksforGeeks</option>
                      <option value="code360">Code360</option>
                      <option value="codeforces">Codeforces</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="difficulty" style={{ fontSize: '13px', fontWeight: '600', color: '#17212B', marginBottom: '6px', display: 'block' }}>Difficulty</label>
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      disabled={isSubmitting}
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="sourceUrl" style={{ fontSize: '13px', fontWeight: '600', color: '#17212B', marginBottom: '6px', display: 'block' }}>Source URL</label>
                    <input
                      id="sourceUrl"
                      type="text"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://leetcode.com/problems/..."
                      disabled={isSubmitting}
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%' }}
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="externalProblemId" style={{ fontSize: '13px', fontWeight: '600', color: '#17212B', marginBottom: '6px', display: 'block' }}>External ID (Slug)</label>
                    <input
                      id="externalProblemId"
                      type="text"
                      value={externalProblemId}
                      onChange={(e) => setExternalProblemId(e.target.value)}
                      placeholder="e.g. two-sum"
                      disabled={isSubmitting}
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#17212B' }}>Constraints</label>
                    <button
                      type="button"
                      onClick={addConstraint}
                      disabled={isSubmitting}
                      className="clear-text-btn"
                      style={{ padding: 0, border: 'none', background: 'none', color: '#168B62', fontWeight: '600', cursor: 'pointer' }}
                    >
                      + Add constraint
                    </button>
                  </div>

                  <div className="dynamic-row-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {constraints.map((c, idx) => (
                      <div key={idx} className="dynamic-row-item" style={{ display: 'flex', gap: '12px' }}>
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => handleConstraintChange(idx, e.target.value)}
                          placeholder="e.g. 1 <= nums.length <= 10^4"
                          disabled={isSubmitting}
                          style={{ flex: 1, padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeConstraint(idx)}
                          disabled={isSubmitting}
                          className="row-action-btn"
                          style={{ border: '1px solid #E3E8E6', background: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#17212B' }}>Examples</label>
                    <button
                      type="button"
                      onClick={addExample}
                      disabled={isSubmitting}
                      className="clear-text-btn"
                      style={{ padding: 0, border: 'none', background: 'none', color: '#168B62', fontWeight: '600', cursor: 'pointer' }}
                    >
                      + Add example
                    </button>
                  </div>

                  {validationErrors.examples && (
                    <div className="field-error" style={{ marginBottom: '8px', color: 'var(--danger)', fontSize: '12.5px' }}>
                      {validationErrors.examples}
                    </div>
                  )}

                  <div className="examples-edit-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {examples.map((ex, idx) => (
                      <div key={idx} className="example-edit-item" style={{ padding: '16px', border: '1px solid #E3E8E6', borderRadius: '8px', backgroundColor: '#F5F7F6' }}>
                        <div className="example-edit-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px' }}>Example {idx + 1}</strong>
                          <button
                            type="button"
                            onClick={() => removeExample(idx)}
                            disabled={isSubmitting}
                            className="row-action-btn"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#667085' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="example-edit-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <input
                            type="text"
                            value={ex.input}
                            onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                            placeholder="Input: nums = [2,7], target = 9"
                            disabled={isSubmitting}
                            style={{ padding: '8px 12px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', backgroundColor: '#FFFFFF' }}
                          />
                          <input
                            type="text"
                            value={ex.output}
                            onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                            placeholder="Output: [0,1]"
                            disabled={isSubmitting}
                            style={{ padding: '8px 12px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', backgroundColor: '#FFFFFF' }}
                          />
                          <textarea
                            rows={1}
                            value={ex.explanation}
                            onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                            placeholder="Explanation..."
                            disabled={isSubmitting}
                            style={{ padding: '8px 12px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', backgroundColor: '#FFFFFF', resize: 'vertical' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#17212B', marginBottom: '6px', display: 'block' }}>Topics</label>
                    <input
                      type="text"
                      value={topics.join(', ')}
                      onChange={(e) => setTopics(e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                      placeholder="e.g. arrays, hashing"
                      disabled={isSubmitting}
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#17212B', marginBottom: '6px', display: 'block' }}>Patterns</label>
                    <input
                      type="text"
                      value={patterns.join(', ')}
                      onChange={(e) => setPatterns(e.target.value.split(',').map((p) => p.trim()).filter(Boolean))}
                      placeholder="e.g. slidingWindow"
                      disabled={isSubmitting}
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic options and action button */}
        <div className="workspace-right-col">
          <div className="options-sticky-card">
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#17212B', marginBottom: '4px', marginTop: 0 }}>
              How should AlgoMentor help?
            </h3>
            <p style={{ fontSize: '14px', color: '#667085', marginBottom: '20px', marginTop: 0 }}>
              Choose one learning mode. You can customise the details if needed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {/* Understand Option */}
              <div
                className={`learning-mode-card ${learningMode === 'understand' ? 'active' : ''}`}
                onClick={() => setLearningMode('understand')}
              >
                <div className="mode-card-radio-dot">
                  <div className="dot-inner"></div>
                </div>
                <div>
                  <div className="mode-card-title">Understand</div>
                  <div className="mode-card-description">
                    Break down the statement, examples, constraints, edge cases and pattern.
                  </div>
                </div>
              </div>

              {/* Guide me Option */}
              <div
                className={`learning-mode-card ${learningMode === 'hints' ? 'active' : ''}`}
                onClick={() => setLearningMode('hints')}
              >
                <div className="mode-card-radio-dot">
                  <div className="dot-inner"></div>
                </div>
                <div>
                  <div className="mode-card-title">Guide me</div>
                  <div className="mode-card-description">
                    Get progressive hints without immediately revealing the full solution.
                  </div>
                </div>
              </div>

              {/* Review my code Option */}
              <div
                className={`learning-mode-card ${learningMode === 'review' ? 'active' : ''} ${learningMode === 'review' && !code.trim() ? 'error' : ''}`}
                onClick={() => setLearningMode('review')}
              >
                <div className="mode-card-radio-dot">
                  <div className="dot-inner"></div>
                </div>
                <div>
                  <div className="mode-card-title">Review my code</div>
                  <div className="mode-card-description">
                    Find issues, missed cases, complexity problems and ways to improve.
                  </div>
                  {learningMode === 'review' && !code.trim() && (
                    <div style={{ fontSize: '13px', color: '#C73E4D', marginTop: '6px', fontWeight: '500' }}>
                      Add your code so AlgoMentor can review it.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {customiseOpen && (
              <div className="customise-checklist-section">
                {/* Presets Row */}
                <div className="presets-row" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
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
                  <div className="field-error" style={{ marginBottom: '12px', color: '#C73E4D', fontSize: '12.5px' }}>{validationErrors.sections}</div>
                )}

                <div className="options-group" style={{ marginBottom: '12px' }}>
                  <h4 className="options-group-title">Understand</h4>
                  <div className="options-checkbox-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

                <div className="options-group" style={{ marginBottom: '12px' }}>
                  <h4 className="options-group-title">Solve</h4>
                  <div className="options-checkbox-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                          <span style={isAI ? { color: '#6D5CE7', fontWeight: '600' } : {}}>
                            {sec.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="options-group" style={{ marginBottom: 0 }}>
                  <h4 className="options-group-title">Prepare</h4>
                  <div className="options-checkbox-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (learningMode === 'review' && !code.trim())}
              className="btn btn-primary btn-block"
              style={{ padding: '12px', fontSize: '15px', fontWeight: '700', borderRadius: '8px', width: '100%', height: '46px' }}
            >
              {isSubmitting ? 'Starting...' : 'Start Learning'}
            </button>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setCustomiseOpen(!customiseOpen)}
                className="clear-text-btn"
                style={{ fontSize: '13px', fontWeight: '600', color: '#168B62', cursor: 'pointer', border: 'none', background: 'none' }}
              >
                {customiseOpen ? '✕ Use simple modes' : 'Customize what I get'}
              </button>
            </div>

            <p className="db-primary-helper" style={{ fontSize: '13px', color: '#667085', marginTop: '16px', textAlign: 'center' }}>
              Your problem is saved, so you can revisit and improve it later.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewAnalysisPage;
export { NewAnalysisPage };
