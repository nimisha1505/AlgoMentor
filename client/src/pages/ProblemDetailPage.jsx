import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProblemById } from '../api/problem.api.js';
import { startProblemAnalysis, getLatestProblemAnalysis } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import { ArrowLeft, Play, ExternalLink } from 'lucide-react';

/**
 * Display complete problem properties, example scenarios, and coding block metadata.
 * Facilitates starting or reviewing completed analyses.
 */
const ProblemDetailPage = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await getProblemById(problemId);
        setProblem(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchProblem();
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
      <div className="page-loader-wrapper">
        <Loader text="Loading problem details..." />
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="problem-detail-container">
        <div className="detail-header-nav">
          <Link to="/problems" className="back-link">
            <ArrowLeft size={16} /> Back to My Problems
          </Link>
        </div>
        <FormError message={error || 'Failed to locate problem.'} />
      </div>
    );
  }

  const normalizedStatus = (problem.status || '').toLowerCase();

  return (
    <div className="problem-detail-container">
      {actionLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <Loader text="AlgoMentor is generating your AI analysis..." />
          </div>
        </div>
      )}

      <div className="detail-header-nav">
        <Link to="/problems" className="back-link">
          <ArrowLeft size={16} /> Back to My Problems
        </Link>
      </div>

      <div className="problem-detail-card">
        <div className="detail-title-row">
          <div>
            <h1 className="problem-title">{problem.title}</h1>
            <div className="problem-meta-tags">
              <span className="meta-tag">Language: {getLanguageLabel(problem.language)}</span>
              <StatusBadge status={problem.status} />
            </div>
          </div>

          <div className="detail-actions">
            {(normalizedStatus === 'draft' || normalizedStatus === 'failed') && (
              <button
                onClick={handleGenerate}
                disabled={actionLoading}
                className="btn btn-primary icon-btn"
              >
                <Play size={16} />
                <span>Run AI Analysis</span>
              </button>
            )}
            {normalizedStatus === 'completed' && (
              <button
                onClick={handleViewLatest}
                disabled={actionLoading}
                className="btn btn-primary icon-btn"
              >
                <ExternalLink size={16} />
                <span>View Analysis</span>
              </button>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3 className="section-title">Problem Statement</h3>
          <div className="statement-content text-pre-wrap">{problem.problemStatement}</div>
        </div>

        {problem.constraints && problem.constraints.length > 0 && (
          <div className="detail-section">
            <h3 className="section-title">Constraints</h3>
            <ul className="constraints-list-view">
              {problem.constraints.map((c, i) => (
                <li key={i} className="constraint-item-view">{c}</li>
              ))}
            </ul>
          </div>
        )}

        {problem.examples && problem.examples.length > 0 && (
          <div className="detail-section">
            <h3 className="section-title">Examples</h3>
            <div className="examples-grid-view">
              {problem.examples.map((ex, index) => (
                <div key={index} className="example-card-view">
                  <h4 className="example-title-view">Example {index + 1}</h4>
                  <div className="example-body-view">
                    <p><strong>Input:</strong> <code>{ex.input}</code></p>
                    <p><strong>Output:</strong> <code>{ex.output}</code></p>
                    {ex.explanation && (
                      <p><strong>Explanation:</strong> <span className="text-muted">{ex.explanation}</span></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {problem.code && (
          <div className="detail-section">
            <h3 className="section-title">Submitted Code Context</h3>
            <CodeBlock code={problem.code} language={problem.language} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemDetailPage;
export { ProblemDetailPage };
