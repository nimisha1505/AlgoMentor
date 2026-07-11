import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysisById } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, Database, Info, HelpCircle } from 'lucide-react';

const AnalysisDetailPage = () => {
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getAnalysisById(analysisId);
        setAnalysis(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysis();
  }, [analysisId]);

  if (isLoading) {
    return (
      <div className="page-loader-wrapper">
        <Loader text="Retrieving AI mentor report..." />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="analysis-detail-container">
        <div className="detail-header-nav">
          <Link to="/problems" className="back-link">
            <ArrowLeft size={16} /> My Problems
          </Link>
        </div>
        <FormError message={error || 'Failed to locate analysis.'} />
      </div>
    );
  }

  const result = analysis.result || {};
  const status = (analysis.status || '').toLowerCase();

  // Rendering Helper: Simple Text Cards
  const renderTextCard = (title, text) => {
    if (!text) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">{title}</h3>
        <div className="text-pre-wrap">{text}</div>
      </div>
    );
  };

  // Rendering Helper: Example Walkthroughs
  const renderExampleExplanations = () => {
    if (!result.exampleExplanation || result.exampleExplanation.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Example Walkthroughs</h3>
        <div className="examples-explanation-list">
          {result.exampleExplanation.map((ex, idx) => (
            <div key={idx} className="example-explain-row">
              <h4 className="explain-row-title">Example {ex.exampleNumber}</h4>
              <p className="text-pre-wrap">{ex.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendering Helper: Constraints
  const renderConstraints = () => {
    if (!result.constraints || result.constraints.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Constraints & Implications</h3>
        <div className="table-responsive">
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Constraint</th>
                <th>Performance Implication</th>
              </tr>
            </thead>
            <tbody>
              {result.constraints.map((c, idx) => (
                <tr key={idx}>
                  <td><code>{c.constraint}</code></td>
                  <td>{c.implication}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Rendering Helper: Edge Cases
  const renderEdgeCases = () => {
    if (!result.edgeCases || result.edgeCases.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Critical Edge Cases</h3>
        <div className="cards-list">
          {result.edgeCases.map((ec, idx) => (
            <div key={idx} className="nested-card">
              <h4 className="nested-card-title">{ec.case}</h4>
              <p className="nested-card-desc">{ec.reason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendering Helper: Pattern Identification
  const renderPattern = () => {
    if (!result.pattern) return null;
    const { name, clues, reason } = result.pattern;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Algorithmic Pattern</h3>
        <div className="pattern-block">
          <p className="pattern-name">
            <strong>Identified Pattern:</strong> {name}
          </p>
          <div className="pattern-clues-box">
            <strong>Key Clues:</strong>
            <ul>
              {clues?.map((clue, idx) => (
                <li key={idx}>{clue}</li>
              ))}
            </ul>
          </div>
          <p className="pattern-reason">
            <strong>Decision Logic:</strong> {reason}
          </p>
        </div>
      </div>
    );
  };

  // Rendering Helper: Hints (progressive details)
  const renderHints = () => {
    if (!result.hints || result.hints.length === 0) return null;
    const sortedHints = [...result.hints].sort((a, b) => a.level - b.level);
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Progressive Learning Hints</h3>
        <p className="card-subtitle-text">Click each hint progressively to guide your thoughts without reading full solutions.</p>
        <div className="hints-details-stack">
          {sortedHints.map((h, idx) => (
            <details key={idx} className="hint-details">
              <summary className="hint-summary">Hint {h.level}</summary>
              <div className="hint-content">{h.hint}</div>
            </details>
          ))}
        </div>
      </div>
    );
  };

  // Rendering Helper: Pseudocode Outline
  const renderPseudocode = () => {
    if (!result.pseudocode || result.pseudocode.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Pseudocode Outline</h3>
        <pre className="monospace-block">
          {result.pseudocode.map((line, idx) => (
            <div key={idx} className="pseudocode-line">
              <span className="line-num">{idx + 1}</span>
              <span className="line-text">{line}</span>
            </div>
          ))}
        </pre>
      </div>
    );
  };

  // Rendering Helper: User Code Review Feedback
  const renderUserCodeReview = () => {
    if (!result.userCodeReview) return null;
    const {
      summary,
      isCorrect,
      strengths,
      bugs,
      missedEdgeCases,
      timeComplexity,
      spaceComplexity,
      improvements,
      correctedCode,
    } = result.userCodeReview;

    return (
      <div className="analysis-section-card user-code-review-card">
        <h3 className="section-card-title">Submitted Code Review</h3>

        <div className="review-badge-row">
          <span className={`correctness-badge ${isCorrect ? 'is-correct' : 'is-incorrect'}`}>
            {isCorrect ? 'Correct Logic' : 'Has Bugs / Inefficiencies'}
          </span>
          <span className="complexity-badge">Time: {timeComplexity}</span>
          <span className="complexity-badge">Space: {spaceComplexity}</span>
        </div>

        <div className="review-section">
          <strong>Summary:</strong>
          <p>{summary}</p>
        </div>

        {strengths && strengths.length > 0 && (
          <div className="review-section">
            <strong>Strengths:</strong>
            <ul>
              {strengths.map((str, idx) => (
                <li key={idx}>{str}</li>
              ))}
            </ul>
          </div>
        )}

        {bugs && bugs.length > 0 && (
          <div className="review-section warning-section">
            <strong>Bugs / Logical Issues:</strong>
            <ul>
              {bugs.map((bug, idx) => (
                <li key={idx}>{bug}</li>
              ))}
            </ul>
          </div>
        )}

        {missedEdgeCases && missedEdgeCases.length > 0 && (
          <div className="review-section warning-section">
            <strong>Missed Edge Cases:</strong>
            <ul>
              {missedEdgeCases.map((ec, idx) => (
                <li key={idx}>{ec}</li>
              ))}
            </ul>
          </div>
        )}

        {improvements && improvements.length > 0 && (
          <div className="review-section">
            <strong>Suggested Improvements:</strong>
            <ul>
              {improvements.map((imp, idx) => (
                <li key={idx}>{imp}</li>
              ))}
            </ul>
          </div>
        )}

        {correctedCode && (
          <div className="review-section">
            <strong>Refactored / Corrected Version:</strong>
            <CodeBlock code={correctedCode} language={analysis.inputSnapshot?.language || ''} />
          </div>
        )}
      </div>
    );
  };

  // Rendering Helper: Approaches
  const renderApproaches = () => {
    if (!result.approaches || result.approaches.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Alternative Approaches</h3>
        <div className="approaches-list">
          {result.approaches.map((ap, idx) => (
            <div key={idx} className="nested-card approach-card">
              <div className="approach-header">
                <h4 className="approach-name">{ap.name}</h4>
                <span className="category-badge">{ap.category}</span>
              </div>
              <div className="approach-complexities">
                <span className="complexity-badge">Time: {ap.timeComplexity}</span>
                <span className="complexity-badge">Space: {ap.spaceComplexity}</span>
              </div>
              <p className="approach-intuition">
                <strong>Intuition:</strong> {ap.intuition}
              </p>
              {ap.steps && ap.steps.length > 0 && (
                <div className="approach-steps">
                  <strong>Implementation Steps:</strong>
                  <ol>
                    {ap.steps.map((s, sIdx) => (
                      <li key={sIdx}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}
              {ap.code && (
                <div className="approach-code-box">
                  <strong>Implementation Draft:</strong>
                  <CodeBlock code={ap.code} language={analysis.inputSnapshot?.language || ''} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendering Helper: Detailed Approach Explanations
  const renderApproachExplanations = () => {
    if (!result.approachExplanations || result.approachExplanations.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Detailed Strategy Breakdowns</h3>
        <div className="cards-list">
          {result.approachExplanations.map((ae, idx) => (
            <div key={idx} className="nested-card">
              <h4 className="nested-card-title">{ae.approach}</h4>
              <p className="nested-card-desc text-pre-wrap">{ae.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendering Helper: Reference Codes List
  const renderCodes = () => {
    if (!result.codes || result.codes.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Reference Implementations</h3>
        <div className="codes-stack">
          {result.codes.map((c, idx) => (
            <div key={idx} className="code-solution-block">
              <h4 className="code-solution-title">{c.approach}</h4>
              <CodeBlock code={c.code} language={c.language} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendering Helper: Complexities Analysis
  const renderComplexities = () => {
    if (!result.complexities || result.complexities.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Mathematical Complexity Analysis</h3>
        <div className="complexities-cards">
          {result.complexities.map((comp, idx) => (
            <div key={idx} className="nested-card">
              <h4 className="nested-card-title">{comp.approach}</h4>
              <div className="complexity-grid">
                <div className="complexity-grid-cell">
                  <strong>Time Complexity:</strong> <code>{comp.timeComplexity}</code>
                  <p className="complexity-reason">{comp.timeReason}</p>
                </div>
                <div className="complexity-grid-cell">
                  <strong>Space Complexity:</strong> <code>{comp.spaceComplexity}</code>
                  <p className="complexity-reason">{comp.spaceReason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Rendering Helper: Dry Run execution tracing
  const renderDryRun = () => {
    if (!result.dryRun) return null;
    const { approach, input, steps, output } = result.dryRun;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Dry Run Trace Steps</h3>
        <div className="dryrun-header">
          <p><strong>Approach Strategy:</strong> {approach}</p>
          <p><strong>Input Traced:</strong> <code>{input}</code></p>
        </div>
        <div className="dryrun-steps-stack">
          {steps?.map((step, idx) => (
            <div key={idx} className="dryrun-step-row">
              <span className="step-badge">Step {idx + 1}</span>
              <span className="step-text">{step}</span>
            </div>
          ))}
        </div>
        <div className="dryrun-footer">
          <strong>Final Output Trace:</strong> <code>{output}</code>
        </div>
      </div>
    );
  };

  // Rendering Helper: Comparison Matrix HTML Table
  const renderComparison = () => {
    if (!result.comparison || result.comparison.length === 0) return null;
    return (
      <div className="analysis-section-card">
        <h3 className="section-card-title">Approach Comparison Matrix</h3>
        <div className="table-responsive">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Approach</th>
                <th>Time</th>
                <th>Space</th>
                <th>Advantages</th>
                <th>Disadvantages</th>
                <th>Interview Suitability</th>
              </tr>
            </thead>
            <tbody>
              {result.comparison.map((row, idx) => (
                <tr key={idx}>
                  <td className="font-semibold">{row.approach}</td>
                  <td><code>{row.timeComplexity}</code></td>
                  <td><code>{row.spaceComplexity}</code></td>
                  <td>
                    <ul className="cell-list">
                      {row.advantages?.map((adv, aIdx) => (
                        <li key={aIdx}>{adv}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul className="cell-list">
                      {row.disadvantages?.map((dis, dIdx) => (
                        <li key={dIdx}>{dis}</li>
                      ))}
                    </ul>
                  </td>
                  <td>{row.interviewSuitability}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-detail-container">
      <div className="detail-header-nav">
        {analysis.problem && (
          <Link to={`/problems/${analysis.problem}`} className="back-link">
            <ArrowLeft size={16} /> Back to Problem
          </Link>
        )}
        <Link to="/problems" className="back-link">
          <Database size={16} /> My Problems
        </Link>
      </div>

      {/* Analysis Status Banner */}
      <div className="analysis-metadata-banner">
        <div className="banner-left">
          <span className="banner-label">AI Analysis Report</span>
          <h1 className="banner-title">{analysis.inputSnapshot?.title || 'Problem Mentorship'}</h1>
        </div>
        <div className="banner-right">
          <div className="metadata-item-box">
            <span className="meta-label">Status</span>
            <StatusBadge status={analysis.status} />
          </div>
          {analysis.modelName && (
            <div className="metadata-item-box">
              <span className="meta-label">AI Engine</span>
              <span className="meta-val font-semibold">{analysis.modelName}</span>
            </div>
          )}
          {analysis.usage && (
            <div className="metadata-item-box">
              <span className="meta-label">Tokens Usage</span>
              <span className="meta-val">
                {analysis.usage.totalTokens || 0} total (In: {analysis.usage.inputTokens || 0} / Out:{' '}
                {analysis.usage.outputTokens || 0})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conditional States */}
      {status === 'failed' && (
        <div className="analysis-failure-box" role="alert">
          <h3 className="fail-title">Analysis Processing Failed</h3>
          <p className="fail-message">{analysis.errorMessage || 'An error occurred during report generation.'}</p>
          <div className="fail-actions">
            {analysis.problem && (
              <Link to={`/problems/${analysis.problem}`} className="btn btn-primary btn-sm">
                Return to Problem Page
              </Link>
            )}
          </div>
        </div>
      )}

      {(status === 'queued' || status === 'processing') && (
        <div className="analysis-status-card">
          <div className="spinner"></div>
          <h3 className="status-card-title">Analysis is currently {status}...</h3>
          <p className="status-card-desc">
            The AI model is examining the problem definition, complexity bounds, examples, and logic.
            Please wait, as reports generate synchronously.
          </p>
        </div>
      )}

      {status === 'completed' && (
        <div className="analysis-results-grid">
          {/* Understand the problem Segment */}
          {renderTextCard('Problem Explanation', result.problemExplanation)}
          {renderTextCard('Input/Output Analysis', result.inputOutput)}
          {renderExampleExplanations()}
          {renderConstraints()}
          {renderEdgeCases()}
          {renderPattern()}

          {/* Learn the solution Segment */}
          {renderHints()}
          {renderPseudocode()}
          {renderApproaches()}
          {renderApproachExplanations()}
          {renderCodes()}
          {renderComplexities()}
          {renderDryRun()}
          {renderComparison()}

          {/* Prepare Segment */}
          {renderUserCodeReview()}
          {renderTextCard('Spoken Interview Walkthrough Guide', result.interviewExplanation)}
        </div>
      )}
    </div>
  );
};

export default AnalysisDetailPage;
export { AnalysisDetailPage };
