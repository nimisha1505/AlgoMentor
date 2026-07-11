import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createProblem } from '../api/problem.api.js';
import { startProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import FormError from '../components/common/FormError.jsx';
import Loader from '../components/common/Loader.jsx';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

const DEFAULT_SECTIONS = [
  'problemExplanation',
  'exampleExplanation',
  'hints',
  'approaches',
  'complexities',
  'interviewExplanation',
];

const SECTIONS_CONFIG = {
  understand: [
    { value: 'problemExplanation', label: 'Problem Explanation' },
    { value: 'inputOutput', label: 'Input/Output Analysis' },
    { value: 'exampleExplanation', label: 'Example Walkthroughs' },
    { value: 'constraints', label: 'Constraints Explanation' },
    { value: 'edgeCases', label: 'Edge Cases Analysis' },
    { value: 'pattern', label: 'Pattern Identification' },
  ],
  learn: [
    { value: 'hints', label: 'Progressive Hints' },
    { value: 'pseudocode', label: 'Pseudocode Outline' },
    { value: 'approaches', label: 'Alternative Approaches List' },
    { value: 'approachExplanations', label: 'Detailed Approach Explanations' },
    { value: 'codes', label: 'Reference Code Solutions' },
    { value: 'complexities', label: 'Complexity Breakdowns' },
    { value: 'dryRun', label: 'Dry Run Steps' },
    { value: 'comparison', label: 'Comparison Matrix' },
  ],
  prepare: [
    { value: 'userCodeReview', label: 'My Code Review / Feedback' },
    { value: 'interviewExplanation', label: 'Spoken Interview Guide' },
  ],
};

const NewAnalysisPage = () => {
  const navigate = useNavigate();

  // Form states
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [constraints, setConstraints] = useState(['']);
  const [examples, setExamples] = useState([{ input: '', output: '', explanation: '' }]);
  const [requestedSections, setRequestedSections] = useState(DEFAULT_SECTIONS);

  // Flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState(''); // 'saving' | 'analyzing'
  const [generalError, setGeneralError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [partialFailure, setPartialFailure] = useState(false);
  const [savedProblemId, setSavedProblemId] = useState(null);

  // Dynamic constraints handlers
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

  // Dynamic examples handlers
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

  // Section checkbox change
  const handleSectionChange = (sectionValue) => {
    if (requestedSections.includes(sectionValue)) {
      setRequestedSections(requestedSections.filter((val) => val !== sectionValue));
    } else {
      setRequestedSections([...requestedSections, sectionValue]);
    }
  };

  // Client side validation
  const validateForm = () => {
    const errors = {};
    if (!title.trim() || title.trim().length < 3) {
      errors.title = 'Title is required and must be at least 3 characters';
    }
    if (!problemStatement.trim() || problemStatement.trim().length < 10) {
      errors.problemStatement = 'Problem statement is required and must be at least 10 characters';
    }
    if (requestedSections.length === 0) {
      errors.sections = 'At least one analysis section must be selected';
    }
    if (requestedSections.includes('userCodeReview') && (!code || code.trim().length === 0)) {
      errors.code = 'Your code is required when user code review is requested';
    }

    // Check examples validity: if any field is filled, both input and output must be present
    const invalidExamples = examples.some(
      (ex) => (ex.input.trim() || ex.output.trim() || ex.explanation.trim()) && (!ex.input.trim() || !ex.output.trim())
    );
    if (invalidExamples) {
      errors.examples = 'Every started example must include both input and output values';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setPartialFailure(false);
    setSavedProblemId(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStep('saving');

    // Filter and sanitize arrays
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

    let problemId = null;

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
      });

      problemId = problem._id;
      setSavedProblemId(problemId);
      
      // 2. Start Gemini analysis
      setSubmitStep('analyzing');
      const analysis = await startProblemAnalysis(problemId);

      // 3. Success: Navigate to analysis detail
      navigate(`/analyses/${analysis._id}`);
    } catch (error) {
      const errMsg = getApiErrorMessage(error);
      if (submitStep === 'saving' || !problemId) {
        // Problem creation failed
        setGeneralError(errMsg);
        setIsSubmitting(false);
      } else {
        // Problem saved successfully, but analysis failed
        setPartialFailure(true);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="new-analysis-container">
      {isSubmitting && (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <Loader
              text={
                submitStep === 'saving'
                  ? 'Saving problem details to database...'
                  : 'AlgoMentor is analysing your problem... This may take up to 2 minutes.'
              }
            />
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">New AI Analysis</h1>
        <p className="page-subtitle">Submit a coding problem to request structured mentoring breakdowns.</p>
      </div>

      {partialFailure && (
        <div className="partial-failure-alert" role="alert">
          <p>
            <strong>Problem saved, but analysis generation failed.</strong>
          </p>
          <p>
            You can retry generating the analysis later from the{' '}
            <Link to="/problems" className="alert-link">
              My Problems
            </Link>{' '}
            page.
          </p>
        </div>
      )}

      {generalError && <FormError message={generalError} />}

      <form onSubmit={handleSubmit} className="analysis-form-layout">
        {/* Core fields card */}
        <div className="form-card">
          <h3 className="card-title">Problem Definition</h3>

          <div className="form-group">
            <label htmlFor="title">Problem Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Two Sum, Reverse a Linked List"
              disabled={isSubmitting}
            />
            {validationErrors.title && <span className="field-error">{validationErrors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="problemStatement">Problem Description *</label>
            <textarea
              id="problemStatement"
              rows={8}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="Paste the complete description, description of inputs, and outputs here..."
              disabled={isSubmitting}
            />
            {validationErrors.problemStatement && (
              <span className="field-error">{validationErrors.problemStatement}</span>
            )}
          </div>
        </div>

        {/* Code review fields card */}
        <div className="form-card">
          <h3 className="card-title">Coding Context (Optional)</h3>
          <p className="card-description">
            Select the language and paste your code implementation below if you want a detailed code review.
          </p>

          <div className="form-group">
            <label htmlFor="language">Programming Language</label>
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

          <div className="form-group">
            <label htmlFor="code">My Implementation Code</label>
            <textarea
              id="code"
              rows={12}
              className="code-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Write or paste your implementation here..."
              disabled={isSubmitting}
            />
            {validationErrors.code && <span className="field-error">{validationErrors.code}</span>}
          </div>
        </div>

        {/* Constraints block */}
        <div className="form-card">
          <div className="card-header-actions">
            <h3 className="card-title">Constraints (Optional)</h3>
            <button
              type="button"
              onClick={addConstraint}
              disabled={isSubmitting}
              className="btn btn-outline btn-sm icon-btn"
            >
              <Plus size={14} /> Add Constraint
            </button>
          </div>
          <p className="card-description">Specify performance thresholds or data range bounds.</p>

          <div className="constraints-list">
            {constraints.map((constraint, index) => (
              <div key={index} className="constraint-row">
                <input
                  type="text"
                  value={constraint}
                  onChange={(e) => handleConstraintChange(index, e.target.value)}
                  placeholder={`e.g. 1 <= nums.length <= 10^4`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => removeConstraint(index)}
                  disabled={isSubmitting}
                  className="delete-row-btn"
                  title="Remove constraint"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Examples block */}
        <div className="form-card">
          <div className="card-header-actions">
            <h3 className="card-title">Examples (Optional)</h3>
            <button
              type="button"
              onClick={addExample}
              disabled={isSubmitting}
              className="btn btn-outline btn-sm icon-btn"
            >
              <Plus size={14} /> Add Example
            </button>
          </div>
          <p className="card-description">Specify example test cases with input and expected output.</p>
          
          {validationErrors.examples && (
            <div className="field-error" style={{ marginBottom: '16px' }}>
              {validationErrors.examples}
            </div>
          )}

          <div className="examples-list">
            {examples.map((example, index) => (
              <div key={index} className="example-card">
                <div className="example-card-header">
                  <span>Example {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeExample(index)}
                    disabled={isSubmitting}
                    className="delete-card-btn"
                    title="Remove example"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="example-card-body">
                  <div className="form-group">
                    <label>Input *</label>
                    <input
                      type="text"
                      value={example.input}
                      onChange={(e) => handleExampleChange(index, 'input', e.target.value)}
                      placeholder="e.g. nums = [2,7,11,15], target = 9"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label>Output *</label>
                    <input
                      type="text"
                      value={example.output}
                      onChange={(e) => handleExampleChange(index, 'output', e.target.value)}
                      placeholder="e.g. [0,1]"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label>Explanation</label>
                    <textarea
                      rows={2}
                      value={example.explanation}
                      onChange={(e) => handleExampleChange(index, 'explanation', e.target.value)}
                      placeholder="Explain the step-by-step logic of this case..."
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checkbox settings card */}
        <div className="form-card">
          <h3 className="card-title">Analysis Modules</h3>
          <p className="card-description">Configure what segments you want the AI mentor to analyze.</p>

          {validationErrors.sections && (
            <div className="field-error" style={{ marginBottom: '16px' }}>
              {validationErrors.sections}
            </div>
          )}

          <div className="sections-selection-grid">
            <div className="section-group">
              <h4 className="group-title">1. Understand the Problem</h4>
              <div className="checkbox-list">
                {SECTIONS_CONFIG.understand.map((sec) => (
                  <label key={sec.value} className="checkbox-label">
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

            <div className="section-group">
              <h4 className="group-title">2. Learn the Solution</h4>
              <div className="checkbox-list">
                {SECTIONS_CONFIG.learn.map((sec) => (
                  <label key={sec.value} className="checkbox-label">
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

            <div className="section-group">
              <h4 className="group-title">3. Interview Preparation</h4>
              <div className="checkbox-list">
                {SECTIONS_CONFIG.prepare.map((sec) => (
                  <label key={sec.value} className="checkbox-label">
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
        </div>

        {/* Submit action panel */}
        <div className="form-actions-panel">
          <Link to="/problems" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            Generate Analysis
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewAnalysisPage;
export { NewAnalysisPage };
