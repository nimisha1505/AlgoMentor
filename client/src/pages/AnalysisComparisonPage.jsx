import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { compareProblemAnalyses } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, ExternalLink, Calendar, Code, CheckSquare, ListPlus, GitBranch } from 'lucide-react';

const AnalysisComparisonPage = () => {
  const { problemId } = useParams();
  const [searchParams] = useSearchParams();
  const first = searchParams.get('first');
  const second = searchParams.get('second');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    const fetchComparison = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (!first || !second) {
          throw new Error('Two analysis attempts must be specified for comparison.');
        }
        const data = await compareProblemAnalyses(problemId, first, second);
        setComparisonData(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchComparison();
  }, [problemId, first, second]);

  if (isLoading) {
    return (
      <div className="loader-container" style={{ minHeight: '50vh' }}>
        <Loader text="Generating comparison report..." />
      </div>
    );
  }

  if (error || !comparisonData) {
    return (
      <div className="container" style={{ marginTop: '24px' }}>
        <Link to={`/problems/${problemId}`} className="back-link">
          <ArrowLeft size={14} /> Back to problem
        </Link>
        <div style={{ marginTop: '16px' }}>
          <FormError message={error || 'Failed to generate comparison.'} />
        </div>
      </div>
    );
  }

  const { firstAnalysis, secondAnalysis, comparisonSummary } = comparisonData;

  const firstResult = firstAnalysis.result || {};
  const secondResult = secondAnalysis.result || {};

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

  const getSectionLabel = (val) => {
    const labels = {
      problemExplanation: 'Simple explanation',
      inputOutput: 'Input and output',
      exampleExplanation: 'Example walkthrough',
      constraints: 'Constraints implications',
      edgeCases: 'Edge cases list',
      missingEdgeCases: 'Missing edge cases',
      pattern: 'Pattern discovery',
      hints: 'Progressive hints',
      pseudocode: 'Pseudocode outline',
      userCodeReview: 'Review my code',
      approaches: 'All approaches',
      approachImprovement: 'Improve my approach',
      approachExplanations: 'Approach explanations',
      codes: 'Reference code solutions',
      complexities: 'Complexity boundaries',
      dryRun: 'Optimal dry run trace',
      comparison: 'Compare solutions',
      interviewExplanation: 'Interview answer guide',
    };
    return labels[val] || val;
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
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
        <Link to={`/problems/${problemId}`} className="back-link">
          <ArrowLeft size={14} /> Back to Problem
        </Link>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Comparing Attempts</span>
      </div>

      <header style={{ marginBottom: '32px' }}>
        <h1 className="welcome-title" style={{ fontSize: '28px' }}>Comparison Report</h1>
        <p className="welcome-subtitle">Review structural changes, code changes, and mentor improvements side-by-side.</p>
      </header>

      {/* Comparison Summary Strip */}
      <section style={{ marginBottom: '40px' }} className="preview-card-item">
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
          Summary of Changes
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', borderRight: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Code Modified
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span className={`status-badge ${comparisonSummary.codeChanged ? 'badge-processing' : 'badge-completed'}`}>
                {comparisonSummary.codeChanged ? 'Modified' : 'No Change'}
              </span>
            </div>
          </div>

          <div style={{ padding: '12px', borderRight: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Language Changed
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span className={`status-badge ${comparisonSummary.languageChanged ? 'badge-processing' : 'badge-completed'}`}>
                {comparisonSummary.languageChanged ? 'Changed' : 'No Change'}
              </span>
            </div>
          </div>

          <div style={{ padding: '12px', borderRight: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Statement Updated
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span className={`status-badge ${comparisonSummary.statementChanged ? 'badge-processing' : 'badge-completed'}`}>
                {comparisonSummary.statementChanged ? 'Modified' : 'No Change'}
              </span>
            </div>
          </div>

          <div style={{ padding: '12px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
              Requested Modules
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              {comparisonSummary.requestedSectionsAdded?.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>
                  + Added: {comparisonSummary.requestedSectionsAdded.map((s) => getSectionLabel(s)).join(', ')}
                </span>
              )}
              {comparisonSummary.requestedSectionsRemoved?.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600' }}>
                  - Removed: {comparisonSummary.requestedSectionsRemoved.map((s) => getSectionLabel(s)).join(', ')}
                </span>
              )}
              {comparisonSummary.requestedSectionsAdded?.length === 0 && comparisonSummary.requestedSectionsRemoved?.length === 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No additions or removals</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-side layout grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="compare-grid-layout">
        
        {/* Left Column: Attempt 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <header style={{ borderBottom: '2px solid var(--border-strong)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Previous Attempt</h2>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} />
                <span>{new Date(comparisonSummary.firstCreatedAt).toLocaleDateString()}</span>
              </span>
              <StatusBadge status={comparisonSummary.firstStatus} />
              {firstAnalysis.modelName && <span>{firstAnalysis.modelName}</span>}
            </div>
            <Link to={`/analyses/${first}`} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
              <ExternalLink size={12} /> Open Full Analysis
            </Link>
          </header>

          {/* Submited Code */}
          <section className="learning-section">
            <h3 className="learning-section-title">Submitted Code Snapshot</h3>
            <CodeBlock code={firstAnalysis.inputSnapshot?.code || 'No code provided.'} language={firstAnalysis.inputSnapshot?.language} />
          </section>

          {/* Missing Edge Cases */}
          <section className="learning-section">
            <h3 className="learning-section-title">Missing Edge Cases Identified</h3>
            {firstResult.missingEdgeCases && firstResult.missingEdgeCases.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {firstResult.missingEdgeCases.map((ec, idx) => (
                  <div key={idx} className="preview-card-item" style={{ borderLeft: '3px solid var(--warning)' }}>
                    <strong style={{ fontSize: '13px', display: 'block' }}>{ec.case}</strong>
                    <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>{ec.whyItMatters}</p>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                No missing edge cases requested or generated.
              </span>
            )}
          </section>

          {/* Approach Improvement */}
          <section className="learning-section">
            <h3 className="learning-section-title">Approach Improvement Feedback</h3>
            {firstResult.approachImprovement ? (
              <div className="preview-card-item" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bottlenecks:</strong>
                  <ul style={{ paddingLeft: '20px', fontSize: '12px', marginTop: '2px' }}>
                    {firstResult.approachImprovement.bottlenecks?.map((b, idx) => <li key={idx}>{b}</li>)}
                  </ul>
                </div>
                <div>
                  <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pattern concept:</strong>
                  <p style={{ fontSize: '12.5px', marginTop: '2px' }}>{firstResult.approachImprovement.patternToLearn}</p>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                No improvement feedback requested or generated.
              </span>
            )}
          </section>

          {/* Complexities */}
          <section className="learning-section">
            <h3 className="learning-section-title">Complexity Boundaries</h3>
            {firstResult.complexities && firstResult.complexities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {firstResult.complexities.map((c, idx) => (
                  <div key={idx} className="preview-card-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span>{c.approach}</span>
                    <strong>Time: {c.timeComplexity} | Space: {c.spaceComplexity}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                No complexity parameters available.
              </span>
            )}
          </section>
        </div>

        {/* Right Column: Attempt 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <header style={{ borderBottom: '2px solid var(--border-strong)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Latest Attempt</h2>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} />
                <span>{new Date(comparisonSummary.secondCreatedAt).toLocaleDateString()}</span>
              </span>
              <StatusBadge status={comparisonSummary.secondStatus} />
              {secondAnalysis.modelName && <span>{secondAnalysis.modelName}</span>}
            </div>
            <Link to={`/analyses/${second}`} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
              <ExternalLink size={12} /> Open Full Analysis
            </Link>
          </header>

          {/* Submited Code */}
          <section className="learning-section">
            <h3 className="learning-section-title">Submitted Code Snapshot</h3>
            <CodeBlock code={secondAnalysis.inputSnapshot?.code || 'No code provided.'} language={secondAnalysis.inputSnapshot?.language} />
          </section>

          {/* Missing Edge Cases */}
          <section className="learning-section">
            <h3 className="learning-section-title">Missing Edge Cases Identified</h3>
            {secondResult.missingEdgeCases && secondResult.missingEdgeCases.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {secondResult.missingEdgeCases.map((ec, idx) => (
                  <div key={idx} className="preview-card-item" style={{ borderLeft: '3px solid var(--warning)' }}>
                    <strong style={{ fontSize: '13px', display: 'block' }}>{ec.case}</strong>
                    <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>{ec.whyItMatters}</p>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                No missing edge cases requested or generated.
              </span>
            )}
          </section>

          {/* Approach Improvement */}
          <section className="learning-section">
            <h3 className="learning-section-title">Approach Improvement Feedback</h3>
            {secondResult.approachImprovement ? (
              <div className="preview-card-item" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bottlenecks:</strong>
                  <ul style={{ paddingLeft: '20px', fontSize: '12px', marginTop: '2px' }}>
                    {secondResult.approachImprovement.bottlenecks?.map((b, idx) => <li key={idx}>{b}</li>)}
                  </ul>
                </div>
                <div>
                  <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pattern concept:</strong>
                  <p style={{ fontSize: '12.5px', marginTop: '2px' }}>{secondResult.approachImprovement.patternToLearn}</p>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                No improvement feedback requested or generated.
              </span>
            )}
          </section>

          {/* Complexities */}
          <section className="learning-section">
            <h3 className="learning-section-title">Complexity Boundaries</h3>
            {secondResult.complexities && secondResult.complexities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {secondResult.complexities.map((c, idx) => (
                  <div key={idx} className="preview-card-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span>{c.approach}</span>
                    <strong>Time: {c.timeComplexity} | Space: {c.spaceComplexity}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                No complexity parameters available.
              </span>
            )}
          </section>
        </div>

      </div>
    </div>
  );
};

export default AnalysisComparisonPage;
export { AnalysisComparisonPage };
