import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { createProblem, importProblemFromUrl } from '../api/problem.api.js';
import { startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import { useAuth } from '../hooks/useAuth.js';
import FormError from '../components/common/FormError.jsx';
import Loader from '../components/common/Loader.jsx';
import { Trash2, FileText, Code2, Lightbulb, BookOpenCheck, Target, Sparkles, Brain, ScanSearch, Trophy, ArrowRight, BadgeInfo, Lock } from 'lucide-react';
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
    accentVariant: 'understand',
  },
  start: {
    label: 'Help Me Start',
    description: 'Identify the likely pattern and reveal progressive hints without showing the full solution.',
    buttonLabel: 'Show My Hint',
    loadingLabel: 'Finding the key observation...',
    requestedSections: ['pattern', 'hints'],
    analysisDepth: 'quick',
    requiresCode: false,
    accentVariant: 'start',
  },
  build: {
    label: 'Build the Solution With Me',
    description: 'Learn brute-force, better, and optimal approaches with pseudocode and complexity.',
    buttonLabel: 'Build the Solution',
    loadingLabel: 'Comparing possible approaches...',
    requestedSections: ['approaches', 'pseudocode', 'complexities', 'comparison'],
    analysisDepth: 'deep',
    requiresCode: false,
    accentVariant: 'build',
  },
  review: {
    label: 'Review My Code',
    description: 'Find bugs, failing cases, missed edge cases, complexity issues, and improvements.',
    buttonLabel: 'Review My Code',
    loadingLabel: 'Reviewing your code and edge cases...',
    requestedSections: ['userCodeReview', 'missingEdgeCases', 'complexities', 'approachImprovement'],
    analysisDepth: 'deep',
    requiresCode: true,
    accentVariant: 'review',
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
    accentVariant: 'complete',
  },
};

const MODE_ORDER = ['understand', 'start', 'build', 'review', 'complete'];

const SECTION_GROUPS = {
  understand: {
    title: 'Understand',
    items: [
      { value: 'problemExplanation', label: 'Simple explanation' },
      { value: 'inputOutput', label: 'Input and output' },
      { value: 'exampleExplanation', label: 'Example walkthrough' },
      { value: 'constraints', label: 'Constraints implications' },
      { value: 'edgeCases', label: 'Edge cases list' },
      { value: 'missingEdgeCases', label: 'Missing edge cases' },
      { value: 'pattern', label: 'Pattern discovery' },
    ]
  },
  solve: {
    title: 'Solve & Improve',
    items: [
      { value: 'hints', label: 'Progressive hints' },
      { value: 'pseudocode', label: 'Pseudocode outline' },
      { value: 'approaches', label: 'All approaches' },
      { value: 'codes', label: 'Reference code solutions' },
      { value: 'complexities', label: 'Complexity boundaries' },
      { value: 'dryRun', label: 'Optimal dry run trace' },
      { value: 'comparison', label: 'Compare solutions' },
      { value: 'approachImprovement', label: 'Improve my approach' },
    ]
  },
  prepare: {
    title: 'Prepare',
    items: [
      { value: 'userCodeReview', label: 'Review my code' },
      { value: 'interviewExplanation', label: 'Interview answer guide' },
    ]
  }
};

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

  const handleSectionToggle = (val) => {
    let updated;
    if (requestedSections.includes(val)) {
      updated = requestedSections.filter((v) => v !== val);
    } else {
      updated = [...requestedSections, val];
    }
    setRequestedSections(updated);
    // Automatically infer depth
    const deepSections = [
      'approaches',
      'pseudocode',
      'codes',
      'complexities',
      'dryRun',
      'comparison',
      'userCodeReview',
      'approachImprovement',
    ];
    const hasDeep = updated.some(s => deepSections.includes(s));
    setAnalysisDepth(hasDeep ? 'deep' : 'quick');
    setValidationErrors((prev) => ({ ...prev, sections: undefined }));
  };

  const handleToggleAllSections = () => {
    const allSecs = Object.values(SECTION_GROUPS).flatMap(g => g.items.map(item => item.value));
    const isAllSelected = allSecs.every(s => requestedSections.includes(s));
    if (isAllSelected) {
      setRequestedSections([]);
    } else {
      setRequestedSections(allSecs);
    }
  };

  // Dynamic deliverables list for summary card
  const getSelectedDeliverables = () => {
    const list = [];
    if (requestedSections.includes('problemExplanation')) list.push('Problem breakdown & understanding');
    if (requestedSections.includes('pattern')) list.push('Pattern identification');
    if (requestedSections.includes('hints')) list.push('Approach hint (not full solution)');
    if (requestedSections.includes('exampleExplanation')) list.push('Examples walkthrough');
    if (requestedSections.includes('complexities')) list.push('Time & Space complexity');
    if (requestedSections.includes('approaches')) list.push('Multiple approach solutions');
    if (requestedSections.includes('pseudocode')) list.push('Structured pseudocode');
    if (requestedSections.includes('userCodeReview')) list.push('User code review & suggestions');
    if (requestedSections.includes('dryRun')) list.push('Interactive dry run tables');
    return list;
  };

  const getDynamicInfoCallout = () => {
    switch (selectedMode) {
      case 'understand':
        return 'You will get a simplified problem breakdown, examples explanation, and constraint analysis.';
      case 'start':
        return 'You will get pattern identification, progressive approach hints, and key observations.';
      case 'build':
        return 'You will get brute-force to optimal approaches comparison, pseudocode, and dry run trace.';
      case 'review':
        return 'You will get user code analysis, bug checks, missing edge cases, and optimization tips.';
      case 'complete':
        return 'You will get the full structured lesson including code solutions, dry run trace, and interview guides.';
      default:
        return 'You will get customized analysis based on your selected modules.';
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

      <Link to="/dashboard" className="back-to-dashboard-link">
        ← Back to Dashboard
      </Link>

      {/* Top Page Header */}
      <div className="new-analysis-header">
        <div className="header-container-inner">
          <div className="header-left-col">
            <div className="header-content">
              <span className="eyebrow-text">Start a Learning Session</span>
              <h1 className="header-title">Analyze a New Problem</h1>
              <p className="header-subtitle">
                Paste a DSA problem, choose your learning depth, and let AlgoMentor guide you step by step.
              </p>
            </div>
          </div>

          <div className="header-right-col">
            <div className="workflow-steps-strip">
              <div className="workflow-step-item">
                <div className="workflow-step-icon">
                  <FileText size={16} />
                </div>
                <span className="workflow-step-label">Paste Problem</span>
              </div>
              <div className="workflow-connector-line"></div>
              <div className="workflow-step-item">
                <div className="workflow-step-icon">
                  <Brain size={16} />
                </div>
                <span className="workflow-step-label">Choose Mode</span>
              </div>
              <div className="workflow-connector-line"></div>
              <div className="workflow-step-item">
                <div className="workflow-step-icon">
                  <Sparkles size={16} />
                </div>
                <span className="workflow-step-label">Generate Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      <form onSubmit={handleSubmit} className="new-analysis-form-wrapper">
        {/* Upper Two-Column Layout */}
        <div className="upper-columns-layout">
          {/* Left Column: Problem details & Code */}
          <div className="workspace-left-column">
            {recommendedProblem && (
              <div className="recommended-practice-banner">
                <div className="banner-info">
                  <span className="banner-eyebrow">Recommended Practice</span>
                  <h4 className="banner-title">{recommendedProblem.title}</h4>
                  <div className="banner-tags">
                    <span className={`difficulty-tag difficulty-${recommendedProblem.difficulty}`}>
                      {recommendedProblem.difficulty}
                    </span>
                    {recommendedProblem.pattern && (
                      <span className="pattern-tag">
                        💡 {recommendedProblem.pattern}
                      </span>
                    )}
                  </div>
                </div>

                <div className="banner-actions">
                  {recommendedProblem.sourceUrl && (
                    <a
                      href={recommendedProblem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="banner-link-btn"
                    >
                      Open original question
                    </a>
                  )}
                  {recommendedProblem.sourceUrl && (
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importLoading}
                      className="banner-action-btn"
                    >
                      {importLoading ? 'Importing...' : 'Import problem details'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 1. Problem Details Card */}
            <div className="workspace-section">
              <h3 className="section-title">1. Problem Details</h3>
              <p className="section-subtitle-text">
                Enter the problem description and metadata or import from a URL.
              </p>

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
                <div className="alert-banner alert-success">
                  <span>{successMessage}</span>
                </div>
              )}

              {importWarning && (
                <div className="alert-banner alert-warning">
                  <span>{importWarning}</span>
                </div>
              )}

              {importError && (
                <div className="alert-banner alert-error">
                  <span>{importError}</span>
                </div>
              )}

              {recommendedProblem && !successMessage && !importWarning && !importError && (
                recommendedProblem.problemStatement ? (
                  <div className="alert-banner alert-success">
                    <span>Recommended problem loaded. You can edit details before starting.</span>
                  </div>
                ) : (
                  <div className="alert-banner alert-warning">
                    <span>Open the original question and paste the full statement below, or use Import Link.</span>
                  </div>
                )
              )}

              {/* Import Link View */}
              {inputMode === 'import' && (
                <div className="import-container">
                  <div className="import-row">
                    <input
                      type="text"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="Paste LeetCode or GeeksforGeeks HTTPS problem URL here..."
                      disabled={importLoading || isSubmitting}
                      className="form-input"
                    />
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importLoading || isSubmitting}
                      className="import-btn"
                    >
                      {importLoading ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                  <div className="supported-platforms">
                    <span>Supported platforms:</span>
                    <span className="platform-tag">LeetCode</span>
                    <span className="platform-tag">GeeksforGeeks</span>
                  </div>
                </div>
              )}

              {/* Paste Problem View */}
              {inputMode === 'paste' && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label htmlFor="problemStatement" className="form-label required">
                      Problem Description <span className="required-marker">*</span>
                    </label>
                    <span className="char-counter" style={{ fontSize: '12px', color: '#667085' }}>
                      {problemStatement.length} / 10000
                    </span>
                  </div>
                  <textarea
                    id="problemStatement"
                    className="problem-textarea"
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value.slice(0, 10000))}
                    placeholder={`Paste the problem statement here...\nInclude the full problem statement along with examples and constraints.`}
                    disabled={isSubmitting}
                  />
                  {validationErrors.problemStatement && (
                    <span className="field-error">{validationErrors.problemStatement}</span>
                  )}
                </div>
              )}

              {/* Metadata row */}
              <div className="form-row-metadata">
                <div className="form-group-meta">
                  <label htmlFor="difficulty" className="form-label required">Difficulty <span className="required-marker">*</span></label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    disabled={isSubmitting}
                    className="form-select"
                  >
                    <option value="unknown">Select difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="form-group-meta">
                  <label htmlFor="topics" className="form-label required">Topic / Category <span className="required-marker">*</span></label>
                  <select
                    id="topics"
                    value={topics[0] || ''}
                    onChange={(e) => setTopics(e.target.value ? [e.target.value] : [])}
                    disabled={isSubmitting}
                    className="form-select"
                  >
                    <option value="">Select topic</option>
                    <option value="arrays">Arrays & Hashing</option>
                    <option value="two-pointers">Two Pointers</option>
                    <option value="sliding-window">Sliding Window</option>
                    <option value="stack">Stack & Queue</option>
                    <option value="binary-search">Binary Search</option>
                    <option value="trees">Trees & Graphs</option>
                    <option value="dynamic-programming">Dynamic Programming</option>
                    <option value="greedy">Greedy Algorithms</option>
                    <option value="recursion">Recursion & Backtracking</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group-meta">
                  <label htmlFor="source" className="form-label">Source (Optional)</label>
                  <input
                    id="source"
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. LeetCode, GFG"
                    disabled={isSubmitting}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Accordion Additional Details */}
              <div className="optional-details-wrapper">
                <button
                  type="button"
                  onClick={() => setOptionalOpen(!optionalOpen)}
                  className="optional-details-trigger"
                >
                  <span>Additional Details (Optional)</span>
                  <span className="trigger-arrow">{optionalOpen ? '▲' : '▼'}</span>
                </button>

                {optionalOpen && (
                  <div className="optional-details-content">
                    <div className="form-group">
                      <label htmlFor="title" className="form-label">Title</label>
                      <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Two Sum (Auto-generated if blank)"
                        disabled={isSubmitting}
                        className="form-input"
                      />
                      {validationErrors.title && (
                        <span className="field-error">{validationErrors.title}</span>
                      )}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="sourceUrl" className="form-label">Source URL</label>
                        <input
                          id="sourceUrl"
                          type="text"
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          placeholder="https://leetcode.com/problems/..."
                          disabled={isSubmitting}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="externalProblemId" className="form-label">External ID (Slug)</label>
                        <input
                          id="externalProblemId"
                          type="text"
                          value={externalProblemId}
                          onChange={(e) => setExternalProblemId(e.target.value)}
                          placeholder="e.g. two-sum"
                          disabled={isSubmitting}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="patterns" className="form-label">Patterns</label>
                      <input
                        id="patterns"
                        type="text"
                        value={patterns.join(', ')}
                        onChange={(e) => setPatterns(e.target.value.split(',').map((p) => p.trim()).filter(Boolean))}
                        placeholder="e.g. slidingWindow, twoPointers"
                        disabled={isSubmitting}
                        className="form-input"
                      />
                    </div>

                    {/* Constraints */}
                    <div className="form-group">
                      <div className="field-list-header">
                        <label className="form-label">Constraints</label>
                        <button
                          type="button"
                          onClick={addConstraint}
                          disabled={isSubmitting}
                          className="add-item-btn"
                        >
                          + Add constraint
                        </button>
                      </div>

                      <div className="dynamic-inputs-list">
                        {constraints.map((c, idx) => (
                          <div key={idx} className="dynamic-input-row">
                            <input
                              type="text"
                              value={c}
                              onChange={(e) => handleConstraintChange(idx, e.target.value)}
                              placeholder="e.g. 1 <= nums.length <= 10^4"
                              disabled={isSubmitting}
                              className="form-input"
                            />
                            <button
                              type="button"
                              onClick={() => removeConstraint(idx)}
                              disabled={isSubmitting}
                              className="remove-row-btn"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Examples */}
                    <div className="form-group">
                      <div className="field-list-header">
                        <label className="form-label">Examples</label>
                        <button
                          type="button"
                          onClick={addExample}
                          disabled={isSubmitting}
                          className="add-item-btn"
                        >
                          + Add example
                        </button>
                      </div>

                      {validationErrors.examples && (
                        <span className="field-error" style={{ marginBottom: '12px', display: 'block' }}>
                          {validationErrors.examples}
                        </span>
                      )}

                      <div className="examples-inputs-grid">
                        {examples.map((ex, idx) => (
                          <div key={idx} className="example-item-card">
                            <div className="example-item-header">
                              <strong>Example {idx + 1}</strong>
                              <button
                                type="button"
                                onClick={() => removeExample(idx)}
                                disabled={isSubmitting}
                                className="remove-row-btn-text"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="example-item-body">
                              <input
                                type="text"
                                value={ex.input}
                                onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                                placeholder="Input: nums = [2,7], target = 9"
                                disabled={isSubmitting}
                                className="form-input"
                              />
                              <input
                                type="text"
                                value={ex.output}
                                onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                                placeholder="Output: [0,1]"
                                disabled={isSubmitting}
                                className="form-input"
                              />
                              <textarea
                                rows={1}
                                value={ex.explanation}
                                onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                                placeholder="Explanation..."
                                disabled={isSubmitting}
                                className="form-textarea-compact"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Your Code Card */}
            <div className="workspace-section">
              <div className="section-header-row">
                <div>
                  <h3 className="section-title">2. Your Code <span className="optional-badge">Optional</span></h3>
                  <p className="section-subtitle-text">
                    Add your code if you have already attempted this problem.
                  </p>
                </div>
                <div className="language-selector-wrap">
                  <label htmlFor="language" className="select-label">Language</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isSubmitting}
                    className="form-select-sm"
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

              <div className="editor-frame-container">
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={isSubmitting}
                  height="320px"
                  isCodeReviewSelected={selectedMode === 'review'}
                />
              </div>
              {validationErrors.code && (
                <span className="field-error" style={{ marginTop: '8px', display: 'block' }}>
                  {validationErrors.code}
                </span>
              )}
            </div>

          </div>

          {/* Right Column: Sticky Summary */}
          <div className="workspace-right-column">
            <div className="learning-rail">
              <div className="sticky-summary-card">
                <div className="summary-card-header">
                  <Sparkles size={16} className="summary-sparkle-icon" />
                  <h3 className="summary-title">Learning Summary</h3>
                </div>
                <div className="summary-details-list">
                  <div className="summary-detail-row">
                    <span className="detail-label">Learning Mode</span>
                    <span className="detail-val mode-name green-accent">
                      {LEARNING_MODES[selectedMode]?.label || 'Custom'}
                    </span>
                  </div>
                  <div className="summary-detail-row">
                    <span className="detail-label">Language</span>
                    <span className="detail-val green-accent text-uppercase">
                      {language === 'cpp' ? 'C++' : language}
                    </span>
                  </div>

                  <div className="summary-detail-row">
                    <span className="detail-label">Modules Selected</span>
                    <span className="detail-val green-accent">
                      {requestedSections.length} sections
                    </span>
                  </div>

                  <div className="summary-detail-row">
                    <span className="detail-label">Code Provided</span>
                    <span className="detail-val green-accent">
                      {code && code.trim().length > 0 ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {LEARNING_MODES[selectedMode] && (
                    <div className="summary-detail-row">
                      <span className="detail-label">Analysis Depth</span>
                      <span className="detail-val depth-pill">
                        {LEARNING_MODES[selectedMode].analysisDepth === 'deep' ? 'DEEP' : 'GUIDED'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mint Info Callout */}
                <div className="summary-info-note">
                  <BadgeInfo size={16} className="note-sparkle" />
                  <span>{getDynamicInfoCallout()}</span>
                </div>

                {/* Deliverables checklist */}
                <div className="summary-deliverables">
                  <span className="deliverables-title">What you'll get:</span>
                  <ul className="deliverables-list">
                    {getSelectedDeliverables().slice(0, 5).map((deliv, idx) => (
                      <li key={idx} className="deliverable-item">
                        <span className="check-icon">✓</span>
                        <span>{deliv}</span>
                      </li>
                    ))}
                    {getSelectedDeliverables().length > 5 && (
                      <li className="deliverable-item more">
                        <span>...and more</span>
                      </li>
                    )}
                    {getSelectedDeliverables().length === 0 && (
                      <li className="deliverable-item none">
                        <span>Select modules to see deliverables</span>
                      </li>
                    )}
                  </ul>
                </div>

                {selectedMode === 'review' && (!code || code.trim().length === 0) && (
                  <p className="summary-warning-text">
                    ⚠️ Please provide code to use the "Review My Code" mode.
                  </p>
                )}

                {Object.keys(validationErrors).length > 0 && (
                  <div className="summary-error-box">
                    <span className="box-title">Form Errors</span>
                    <ul className="box-list">
                      {Object.entries(validationErrors).map(([key, err]) => (
                        <li key={key}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    requestedSections.length === 0 ||
                    (LEARNING_MODES[selectedMode]?.requiresCode && (!code || code.trim().length === 0))
                  }
                  className="analyze-submit-btn"
                >
                  {isSubmitting ? (
                    <span>{LEARNING_MODES[selectedMode]?.loadingLabel ?? 'Preparing...'}</span>
                  ) : (
                    <>
                      <Target size={16} />
                      <span>{LEARNING_MODES[selectedMode]?.buttonLabel ?? 'Analyze Problem'}</span>
                    </>
                  )}
                </button>

                <p className="summary-footer-text">
                  <Lock size={12} className="lock-icon" />
                  <span>Your data is secure and used only to generate your analysis.</span>
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Lower Full-Width Layout */}
        <div className="lower-full-width-layout">
          {/* 3. Choose Learning Mode Card */}
          <div className="workspace-section full-width-card">
            <h3 className="section-title">3. Choose Learning Mode</h3>
            <p className="section-subtitle-text">
              Select how you want to learn and what level of guidance you need.
            </p>

            <div className="learning-modes-grid-row">
              {MODE_ORDER.map((modeId) => {
                const m = LEARNING_MODES[modeId];
                const isSelected = selectedMode === modeId;
                let Icon = Brain;
                if (modeId === 'start') Icon = Lightbulb;
                if (modeId === 'build') Icon = Code2;
                if (modeId === 'review') Icon = ScanSearch;
                if (modeId === 'complete') Icon = Trophy;

                return (
                  <div
                    key={modeId}
                    onClick={() => handleModeSelection(modeId)}
                    className={`mode-card mode-${modeId} ${isSelected ? 'selected' : ''}`}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleModeSelection(modeId); }}
                  >
                    <div className="mode-card-header">
                      <div className="mode-icon">
                        <Icon size={20} strokeWidth={1.5} />
                      </div>
                      <div className="mode-radio">
                        <div className="mode-radio-dot"></div>
                      </div>
                    </div>

                    <div className="mode-card-body">
                      <h4 className="mode-card-title">{m.label}</h4>
                      <p className="mode-card-description">{m.description}</p>
                    </div>

                    <div className="mode-card-footer">
                      <span className="mode-depth-badge">
                        {m.analysisDepth === 'deep' ? 'DEEP' : 'QUICK'}
                      </span>
                      <span className="mode-sections-count">
                        {m.requestedSections.length} sections
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Customize Analysis Modules Card */}
          <div className="workspace-section full-width-card">
            <div className="section-header-row">
              <div>
                <h3 className="section-title">4. Customize Analysis Modules <span className="optional-badge">Optional</span></h3>
                <p className="section-subtitle-text">
                  Pick specific sections you want in your analysis. Selected preset modules can be modified here.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAllSections}
                className="select-all-btn"
              >
                {Object.values(SECTION_GROUPS).flatMap(g => g.items.map(item => item.value)).every(s => requestedSections.includes(s))
                  ? 'Clear All'
                  : 'Select All'}
              </button>
            </div>

            <div className="custom-sections-groups">
              {Object.entries(SECTION_GROUPS).map(([groupKey, group]) => (
                <div key={groupKey} className="custom-section-group">
                  <h4 className="group-title-label">{group.title}</h4>
                  <div className="chips-list">
                    {group.items.map((item) => {
                      const isSelected = requestedSections.includes(item.value);
                      return (
                        <label
                          key={item.value}
                          className={`custom-checkbox-chip ${isSelected ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSectionToggle(item.value)}
                            disabled={isSubmitting}
                            className="hidden-checkbox"
                          />
                          <span className="chip-checkbox-box">
                            {isSelected && <span className="chip-checkbox-check">✓</span>}
                          </span>
                          <span className="chip-label">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {validationErrors.sections && (
              <span className="field-error" style={{ marginTop: '12px', display: 'block' }}>
                {validationErrors.sections}
              </span>
            )}
          </div>

        </div>

      </form>
    </div>
  );
};

export default NewAnalysisPage;
export { NewAnalysisPage };
