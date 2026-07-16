import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { createProblem, importProblemFromUrl } from '../api/problem.api.js';
import { startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import { useAuth } from '../hooks/useAuth.js';
import FormError from '../components/common/FormError.jsx';
import Loader from '../components/common/Loader.jsx';
import { Trash2 } from 'lucide-react';
import CodeEditor from '../components/common/CodeEditor.jsx';

// ============================================================
// CENTRAL LEARNING MODE CONFIGURATION
// All mode logic lives here — do not duplicate below.
// ============================================================
const LEARNING_MODES = {
  understand: {
    label: 'Understand the Problem',
    description: 'Simplify the statement, input/output, examples, constraints, and important edge cases.',
    buttonLabel: 'Understand the Problem',
    loadingLabel: 'Simplifying the problem...',
    requestedSections: ['problemExplanation', 'inputOutput', 'exampleExplanation', 'constraints', 'edgeCases'],
    analysisDepth: 'quick',
    requiresCode: false,
    accentVariant: 'green',
  },
  start: {
    label: 'Help Me Start',
    description: 'Identify the likely pattern and reveal progressive hints without showing the full solution.',
    buttonLabel: 'Show My First Hint',
    loadingLabel: 'Finding the key observation...',
    requestedSections: ['pattern', 'hints'],
    analysisDepth: 'quick',
    requiresCode: false,
    accentVariant: 'green',
  },
  build: {
    label: 'Build the Solution With Me',
    description: 'Learn brute-force, better, and optimal approaches with pseudocode and complexity.',
    buttonLabel: 'Build the Solution',
    loadingLabel: 'Comparing possible approaches...',
    requestedSections: ['approaches', 'pseudocode', 'complexities', 'comparison'],
    analysisDepth: 'deep',
    requiresCode: false,
    accentVariant: 'green',
  },
  review: {
    label: 'Review My Code',
    description: 'Find bugs, failing cases, missed edge cases, complexity issues, and improvements.',
    buttonLabel: 'Review My Code',
    loadingLabel: 'Reviewing your code and edge cases...',
    requestedSections: ['userCodeReview', 'missingEdgeCases', 'complexities', 'approachImprovement'],
    analysisDepth: 'deep',
    requiresCode: true,
    accentVariant: 'violet',
  },
  complete: {
    label: 'Show Complete Solution',
    description: 'See the full structured lesson with approaches, code, dry run, complexity, and interview explanation.',
    buttonLabel: 'Generate Complete Solution',
    loadingLabel: 'Preparing the complete lesson...',
    requestedSections: [
      'problemExplanation', 'inputOutput', 'exampleExplanation', 'constraints', 'edgeCases',
      'missingEdgeCases', 'pattern', 'hints', 'approaches', 'pseudocode', 'codes',
      'complexities', 'dryRun', 'comparison', 'interviewExplanation', 'approachImprovement',
    ],
    analysisDepth: 'deep',
    requiresCode: false,
    accentVariant: 'green',
  },
};

const MODE_ORDER = ['understand', 'start', 'build', 'review', 'complete'];


const NewAnalysisPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const initialized = React.useRef(false);
  const recommendedProblem = location.state?.recommendedProblem ?? null;

  // Form inputs
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [constraints, setConstraints] = useState(['']);
  const [examples, setExamples] = useState([{ input: '', output: '', explanation: '' }]);
  const [requestedSections, setRequestedSections] = useState(LEARNING_MODES.understand.requestedSections);
  const [selectedMode, setSelectedMode] = useState('understand');
  // analysisDepth is derived from selectedMode via LEARNING_MODES — never shown to the student
  const [analysisDepth, setAnalysisDepth] = useState(LEARNING_MODES.understand.analysisDepth);
  const [topics, setTopics] = useState([]);
  const [patterns, setPatterns] = useState([]);

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

  useEffect(() => {
    if (recommendedProblem && !initialized.current) {
      initialized.current = true;
      setTitle(recommendedProblem.title ?? "");
      setSource(recommendedProblem.source ?? "custom");
      setSourceUrl(recommendedProblem.sourceUrl ?? "");
      setImportUrl(recommendedProblem.sourceUrl ?? "");
      setExternalProblemId(recommendedProblem.externalId ?? "");
      setDifficulty(recommendedProblem.difficulty ?? "unknown");
      setTopics(recommendedProblem.topic ? [recommendedProblem.topic] : []);
      setPatterns(recommendedProblem.pattern ? [recommendedProblem.pattern] : []);

      if (recommendedProblem.problemStatement) {
        setProblemStatement(recommendedProblem.problemStatement);
        setInputMode('paste');
      } else {
        setProblemStatement("");
      }

      // Map recommendation intent to the final mode IDs
      let mode = 'understand';
      if (recommendedProblem.guidedPractice || (recommendedProblem.status && recommendedProblem.status.toLowerCase() === 'attempted')) {
        mode = 'start';
      }
      setSelectedMode(mode);
      setRequestedSections(LEARNING_MODES[mode].requestedSections);
      setAnalysisDepth(LEARNING_MODES[mode].analysisDepth);
    }
  }, [recommendedProblem]);

  const [optionalOpen, setOptionalOpen] = useState(false);

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

  // Mode selection: all logic driven by central LEARNING_MODES config
  const handleModeSelection = (mode) => {
    if (!LEARNING_MODES[mode]) return;
    setSelectedMode(mode);
    // For 'complete', append userCodeReview only when code is non-empty
    let sections = [...LEARNING_MODES[mode].requestedSections];
    if (mode === 'complete' && code && code.trim().length > 0) {
      sections = Array.from(new Set([...sections, 'userCodeReview']));
    }
    setRequestedSections(sections);
    setAnalysisDepth(LEARNING_MODES[mode].analysisDepth);
    // Clear stale mode-specific validation errors
    setValidationErrors((prev) => ({ ...prev, code: undefined, sections: undefined }));
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

    // Use requiresCode from config — do not infer from section key names
    const requiresCode = LEARNING_MODES[selectedMode]?.requiresCode ?? false;
    if (requiresCode && (!code || code.trim().length === 0)) {
      errors.code = 'Add your code to use Review My Code.';
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
        requestedSections: Array.from(new Set(
          // For 'complete', ensure userCodeReview is included only when code is present
          selectedMode === 'complete' && code && code.trim().length > 0
            ? [...requestedSections, 'userCodeReview']
            : requestedSections
        )),
        analysisDepth: analysisDepth,
        topics,
        patterns,
        source,
        sourceUrl,
        externalProblemId,
        difficulty,
        recommendationKey: recommendedProblem?.externalId || recommendedProblem?.recommendationKey,
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
    <div className="new-analysis-page">
      {/* Visual Submission Overlay Screen */}
      {isSubmitting && (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <Loader text={LEARNING_MODES[selectedMode]?.loadingLabel ?? 'Preparing your analysis...'} />
          </div>
        </div>
      )}

      {/* Top Page Header */}
      <header className="workspace-page-header">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="back-btn"
        >
          ← Back
        </button>
        <h1 className="page-title">Learn this problem</h1>
        <p className="page-subtitle">
          Add the question, include your code if you have one, and choose where you need help.
        </p>
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

      <form onSubmit={handleSubmit} className="new-analysis-layout">
        {/* Left Column: Problem Editor Fields */}
        <div className="main-learning-workspace">
          {recommendedProblem && (
            <div className="say-in-interview-callout" style={{ border: '1px solid #E3E8E6', backgroundColor: '#F5F7F6', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span className="callout-title" style={{ color: '#168B62', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Recommended practice</span>
                  <h4 style={{ margin: '4px 0', fontSize: '16px', fontWeight: '800', color: '#17212B' }}>{recommendedProblem.title}</h4>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span className={`difficulty-indicator-${recommendedProblem.difficulty}`} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                      {recommendedProblem.difficulty}
                    </span>
                    {recommendedProblem.pattern && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EAF7F1', color: '#168B62', fontWeight: '600' }}>
                        💡 {recommendedProblem.pattern}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {recommendedProblem.sourceUrl && (
                    <a
                      href={recommendedProblem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12.5px', padding: '6px 12px', textDecoration: 'none', height: 'auto', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Open original question
                    </a>
                  )}
                  {recommendedProblem.sourceUrl && (
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importLoading}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '12.5px', padding: '6px 12px', height: 'auto', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {importLoading ? 'Importing...' : 'Import problem details'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Problem */}
          <div className="workspace-section">
            <div className="workspace-section-header">
              <h3 className="workspace-section-title">Problem</h3>
            </div>
            <hr className="workspace-section-divider" />

            <div className="tab-switch-container">
              <button
                type="button"
                className={`tab-switch-btn ${inputMode === 'paste' ? 'active' : ''}`}
                onClick={() => setInputMode('paste')}
              >
                Paste Problem
              </button>
              <button
                type="button"
                className={`tab-switch-btn ${inputMode === 'import' ? 'active' : ''}`}
                onClick={() => setInputMode('import')}
              >
                Import Link
              </button>
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

            {recommendedProblem && !successMessage && !importWarning && !importError && (
              recommendedProblem.problemStatement ? (
                <div className="alert alert-success" style={{ marginBottom: '16px', padding: '10px 16px', backgroundColor: '#EAF7F1', color: '#168B62', borderRadius: '8px', border: '1px solid #E3E8E6', fontSize: '13px' }}>
                  <span>Recommended problem loaded. You can edit the details before starting.</span>
                </div>
              ) : (
                <div className="alert alert-warning" style={{ marginBottom: '16px', padding: '10px 16px', backgroundColor: '#FFF7E6', color: '#B7791F', borderRadius: '8px', border: '1px solid #E3E8E6', fontSize: '13px' }}>
                  <span>Open the original question and paste the full statement below, or use Import Link.</span>
                </div>
              )
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
                    style={{ flex: 1, padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', backgroundColor: '#FFFFFF', fontSize: '14px' }}
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
                  <span className="platform-badge" style={{ backgroundColor: '#FFFFFF', padding: '3px 10px', borderRadius: '12px', border: '1px solid #E3E8E6', fontWeight: '600' }}>LeetCode</span>
                  <span className="platform-badge" style={{ backgroundColor: '#FFFFFF', padding: '3px 10px', borderRadius: '12px', border: '1px solid #E3E8E6', fontWeight: '600' }}>GeeksforGeeks</span>
                </div>
              </div>
            )}

            {/* Paste Problem Mode view */}
            {inputMode === 'paste' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <p className="workspace-section-helper">
                  Paste the complete problem statement. You can include examples and constraints directly.
                </p>
                <textarea
                  id="problemStatement"
                  className="problem-textarea"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder={`Example:\nGiven an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].`}
                  disabled={isSubmitting}
                />
                {validationErrors.problemStatement && (
                  <span className="field-error" style={{ color: 'var(--danger)', fontSize: '12.5px', marginTop: '4px', display: 'block' }}>{validationErrors.problemStatement}</span>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Code (Optional) */}
          <div className="workspace-section">
            <div className="workspace-section-header">
              <h3 className="workspace-section-title">Your Code</h3>
              <span className="workspace-section-badge">Optional</span>
            </div>
            <hr className="workspace-section-divider" />

            <p className="workspace-section-helper">
              Add code only when you want it reviewed. You can leave this empty for problem understanding or solution guidance.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
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

            <div className="monaco-editor-frame-open">
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                disabled={isSubmitting}
                height="320px"
                isCodeReviewSelected={selectedMode === 'review'}
              />
              {/* Live: if Review mode and code empty, show inline hint */}
              {selectedMode === 'review' && (!code || code.trim().length === 0) && (
                <p style={{ fontSize: '12.5px', color: 'var(--danger)', marginTop: '8px', marginLeft: '2px' }}>
                  Add your code to use Review My Code.
                </p>
              )}
            </div>
            {validationErrors.code && (
              <span className="field-error" style={{ margin: '8px 4px 0 4px', display: 'block', color: 'var(--danger)', fontSize: '12.5px' }}>
                {validationErrors.code}
              </span>
            )}
          </div>

          {/* Section 3: Optional problem details accordion */}
          <div className="workspace-section" style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setOptionalOpen(!optionalOpen)}
              className="optional-details-trigger"
            >
              <span>Optional Problem Details</span>
              <span>{optionalOpen ? '▲' : '▼'}</span>
            </button>

            {optionalOpen && (
              <div className="optional-details-content">
                <div className="form-group">
                  <label htmlFor="title" style={{ fontSize: '13px', fontWeight: '600', color: '#17212B', marginBottom: '6px', display: 'block' }}>Title (Optional)</label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Two Sum (Auto-generated if blank)"
                    disabled={isSubmitting}
                    style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%', backgroundColor: '#FFFFFF' }}
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
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%', backgroundColor: '#FFFFFF' }}
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
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%', backgroundColor: '#FFFFFF' }}
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
                          style={{ flex: 1, padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', backgroundColor: '#FFFFFF' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeConstraint(idx)}
                          disabled={isSubmitting}
                          className="row-action-btn"
                          style={{ border: '1px solid #E3E8E6', background: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#FFFFFF' }}
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
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%', backgroundColor: '#FFFFFF' }}
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
                      style={{ padding: '10px 16px', border: '1px solid #E3E8E6', borderRadius: '8px', outline: 'none', width: '100%', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Learning Rail */}
        <div className="learning-rail">
          <div>
            <h3 className="rail-heading">Where are you stuck?</h3>
            <p className="rail-subtitle">Choose one option. You can change it before continuing.</p>

            <div className="rail-options-container">
              {MODE_ORDER.map((modeId) => {
                const m = LEARNING_MODES[modeId];
                const isSelected = selectedMode === modeId;
                const accentClass = isSelected
                  ? m.accentVariant === 'violet' ? 'selected-violet' : 'selected-green'
                  : '';
                return (
                  <div
                    key={modeId}
                    onClick={() => handleModeSelection(modeId)}
                    className={`rail-option-row ${accentClass}`}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleModeSelection(modeId); }}
                  >
                    <div className="rail-radio-circle">
                      <div className="rail-radio-dot"></div>
                    </div>
                    <div className="rail-option-content">
                      <span className="rail-option-label">{m.label}</span>
                      <span className="rail-option-description">{m.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            {/* Review My Code inline validation */}
            {selectedMode === 'review' && (!code || code.trim().length === 0) && (
              <p style={{ fontSize: '12.5px', color: 'var(--danger)', marginBottom: '10px' }}>
                Add your code to use Review My Code.
              </p>
            )}

            {validationErrors.sections && (
              <div className="field-error" style={{ marginBottom: '12px', color: 'var(--danger)', fontSize: '12.5px' }}>
                {validationErrors.sections}
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                requestedSections.length === 0 ||
                (LEARNING_MODES[selectedMode]?.requiresCode && (!code || code.trim().length === 0))
              }
              className="rail-submit-btn"
            >
              {isSubmitting
                ? (LEARNING_MODES[selectedMode]?.loadingLabel ?? 'Preparing...')
                : (LEARNING_MODES[selectedMode]?.buttonLabel ?? 'Get Help')}
            </button>

            <p className="db-primary-helper" style={{ fontSize: '13px', color: '#667085', marginTop: '16px', textAlign: 'center' }}>
              Your problem is saved so you can revisit and improve it later.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewAnalysisPage;
export { NewAnalysisPage };
