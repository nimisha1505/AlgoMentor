import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAnalysisById, createAnalysisFollowUp, getAnalysisFollowUps, startProblemAnalysis, generateApproachCode, generateApproachDryRun } from '../api/analysis.api.js';
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CodeBlock from '../components/common/CodeBlock.jsx';
import Loader from '../components/common/Loader.jsx';
import FormError from '../components/common/FormError.jsx';
import {
  ArrowLeft, BookOpen, Clock, Award, Send, Sparkles, AlertCircle,
  Target, Lightbulb, BarChart2, GitBranch, FileCode, Layers,
  AlertTriangle, CheckCircle2, TrendingUp, Brain, Star, Bookmark,
  Zap, Code2, ChevronDown, ChevronUp, Hash, AlignLeft,
  Activity, Cpu, MessageSquare
} from 'lucide-react';

const getFriendlyErrorMessage = (errMsg) => {
  if (!errMsg) {
    return 'Something went wrong while generating this analysis.';
  }

  let codeFound = false;
  let parsedMessage = '';

  try {
    if (typeof errMsg === 'string' && errMsg.trim().startsWith('{')) {
      const parsed = JSON.parse(errMsg);
      const status = parsed.status || parsed.code || (parsed.error && (parsed.error.status || parsed.error.code));
      if ([429, 500, 502, 503, 504].includes(Number(status))) {
        codeFound = true;
      }
      parsedMessage = parsed.message || (parsed.error && parsed.error.message);
    }
  } catch (e) {}

  if (!codeFound) {
    const match = errMsg.match(/\b(429|500|502|503|504)\b/);
    if (match) {
      codeFound = true;
    }
  }

  if (codeFound) {
    return 'The AI service is temporarily busy. Your problem and code are still saved.' + (parsedMessage ? ` Detail: ${parsedMessage}` : '');
  }

  if (typeof errMsg === 'string') {
    return errMsg;
  }

  if (parsedMessage) {
    return parsedMessage;
  }

  return 'Something went wrong while generating this analysis.';
};

const getPseudocodeString = (pseudo) => {
  if (!pseudo) return '';
  if (Array.isArray(pseudo)) {
    return pseudo.join('\n');
  }
  return String(pseudo);
};

const safeStringify = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return '';
    }
  }
  return String(val);
};

const decodeHtmlEntities = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

const STRIP_HTML_TAGS_REGEX = /<\/?(?:p|br|span|strong|b|em|i|code|div|ul|ol|li|a|h1|h2|h3|h4|h5|h6|mark|small|sub|sup|del|ins)\b[^>]*\/?>/gi;

const stripSimpleHtmlTags = (str) => {
  if (!str || typeof str !== 'string') return '';
  const withNewlines = str.replace(/<br\s*\/?>/gi, '\n');
  return withNewlines.replace(STRIP_HTML_TAGS_REGEX, '');
};

const renderInlineFormattedText = (text, keyPrefix = 'txt') => {
  if (!text || typeof text !== 'string') return text;

  const decoded = decodeHtmlEntities(text);
  const lines = decoded.split('\n');

  return lines.map((line, lineIdx) => {
    const parts = line.split(/`([^`]+)`/g);
    const lineContent = parts.map((part, partIdx) => {
      if (partIdx % 2 === 1) {
        return (
          <code key={`${keyPrefix}-l${lineIdx}-c${partIdx}`} className="adp-inline-code">
            {part}
          </code>
        );
      }
      return part;
    });

    return (
      <React.Fragment key={`${keyPrefix}-l${lineIdx}`}>
        {lineIdx > 0 && <br />}
        {lineContent}
      </React.Fragment>
    );
  });
};

const formatAiTextString = (str) => {
  if (str === null || str === undefined) return '';
  let formatted = String(str);

  // Convert <li>...</li> into bullet lines
  formatted = formatted.replace(/<li\b[^>]*>/gi, '- ');
  formatted = formatted.replace(/<\/li>/gi, '\n');

  // Remove <ul> and </ul>
  formatted = formatted.replace(/<\/?ul\b[^>]*>/gi, '');

  // Remove <ol> and </ol>
  formatted = formatted.replace(/<\/?ol\b[^>]*>/gi, '');

  // Convert <br>, <br/>, and <br /> into line breaks
  formatted = formatted.replace(/<br\s*\/?>/gi, '\n');

  // Convert <p> and </p> into line breaks
  formatted = formatted.replace(/<p\b[^>]*>/gi, '\n');
  formatted = formatted.replace(/<\/p>/gi, '\n');

  // Remove remaining HTML tags safely (keeping math operators)
  formatted = formatted.replace(/<\/?[a-zA-Z][^>]*>/g, '');

  // Decode HTML entities
  formatted = decodeHtmlEntities(formatted);

  // Preserve readable line breaks (remove multiple empty lines)
  const lines = formatted.split('\n').map(line => line.trim());
  const cleanedLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '' && (i === 0 || lines[i - 1] === '')) {
      continue;
    }
    cleanedLines.push(lines[i]);
  }

  return cleanedLines.join('\n').trim();
};

const renderSafeInlineFormattedText = (text, keyPrefix = 'ai-txt') => {
  if (!text || typeof text !== 'string') return text;

  const parts = text.split(/`([^`]+)`/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return (
        <code key={`${keyPrefix}-c${idx}`} className="adp-inline-code">
          {part}
        </code>
      );
    }
    return part;
  });
};

const renderAiText = (val, keyPrefix = 'ai', inline = false) => {
  if (val === null || val === undefined) return null;

  if (Array.isArray(val)) {
    const items = val.map(item => {
      if (item === null || item === undefined) return null;
      if (typeof item === 'object') {
        return item.constraint || item.case || item.hint || safeStringify(item);
      }
      return String(item);
    }).filter(Boolean);

    if (items.length === 0) return null;

    return (
      <ul className="analysis-points-list adp-bullet-list" style={{ margin: 0, paddingLeft: '20px' }}>
        {items.map((item, idx) => (
          <li key={idx} className="adp-body-text" style={{ whiteSpace: 'pre-line' }}>
            {renderSafeInlineFormattedText(formatAiTextString(item), `${keyPrefix}-arr-${idx}`)}
          </li>
        ))}
      </ul>
    );
  }

  let str = '';
  if (typeof val === 'object') {
    str = val.constraint || val.case || val.hint || safeStringify(val);
  } else {
    str = String(val);
  }

  const formatted = formatAiTextString(str);
  if (!formatted) return null;

  const Wrapper = inline ? 'span' : 'div';

  return (
    <Wrapper className="adp-body-text" style={{ whiteSpace: 'pre-line', display: inline ? 'inline' : 'block' }}>
      {renderSafeInlineFormattedText(formatted, `${keyPrefix}-str`)}
    </Wrapper>
  );
};


const parseAndRenderProblemExplanation = (val) => {
  if (!val) return null;

  let rawString = '';
  const isArrayInput = Array.isArray(val);

  if (isArrayInput) {
    const strItems = val.map(v => typeof v === 'string' ? v : safeStringify(v)).filter(Boolean);
    if (strItems.length === 0) return null;
    rawString = strItems.join('\n');
  } else if (typeof val === 'object') {
    rawString = safeStringify(val);
  } else {
    rawString = String(val);
  }

  rawString = rawString.trim();
  if (!rawString) return null;

  // 1. Check for literal <li> tags in HTML list
  const hasLiTags = /<li\b[^>]*>/i.test(rawString);
  if (hasLiTags) {
    const listItems = [];
    const liRegex = /<li\b[^>]*>([\s\S]*?)(?:<\/li>|$)/gi;
    let match;
    while ((match = liRegex.exec(rawString)) !== null) {
      const itemContent = stripSimpleHtmlTags(match[1]).trim();
      if (itemContent) {
        listItems.push(itemContent);
      }
    }

    if (listItems.length > 0) {
      return (
        <ul className="analysis-points-list">
          {listItems.map((item, idx) => (
            <li key={idx} className="adp-body-text">
              {renderInlineFormattedText(item, `prob-exp-li-${idx}`)}
            </li>
          ))}
        </ul>
      );
    }
  }

  // 2. Check for Markdown-style bullet lines or array items
  const lines = rawString.split(/\r?\n/);
  const nonEmpLines = lines.map(l => l.trim()).filter(Boolean);

  const hasMarkdownBullets = nonEmpLines.some(l => /^(?:[-•*]|\d+\.)\s+/.test(l));

  if (hasMarkdownBullets || (isArrayInput && nonEmpLines.length > 0)) {
    const listItems = nonEmpLines.map(line => {
      const unbulleted = line.replace(/^(?:[-•*]|\d+\.)\s+/, '');
      return stripSimpleHtmlTags(unbulleted).trim();
    }).filter(Boolean);

    if (listItems.length > 0) {
      return (
        <ul className="analysis-points-list">
          {listItems.map((item, idx) => (
            <li key={idx} className="adp-body-text">
              {renderInlineFormattedText(item, `prob-exp-md-${idx}`)}
            </li>
          ))}
        </ul>
      );
    }
  }

  // 3. Newline-separated points (multiple lines, no double newline or <p> tags)
  if (nonEmpLines.length > 1 && !rawString.includes('<p>') && !rawString.includes('\n\n')) {
    const listItems = nonEmpLines.map(line => stripSimpleHtmlTags(line).trim()).filter(Boolean);
    if (listItems.length > 0) {
      return (
        <ul className="analysis-points-list">
          {listItems.map((item, idx) => (
            <li key={idx} className="adp-body-text">
              {renderInlineFormattedText(item, `prob-exp-nl-${idx}`)}
            </li>
          ))}
        </ul>
      );
    }
  }

  // 4. Non-list content (Paragraphs)
  const hasPTags = /<p\b[^>]*>/i.test(rawString);
  let paragraphs = [];

  if (hasPTags) {
    const pRegex = /<p\b[^>]*>([\s\S]*?)(?:<\/p>|$)/gi;
    let match;
    while ((match = pRegex.exec(rawString)) !== null) {
      const pContent = stripSimpleHtmlTags(match[1]).trim();
      if (pContent) {
        paragraphs.push(pContent);
      }
    }
  }

  if (paragraphs.length === 0) {
    paragraphs = rawString
      .split(/(?:\r?\n){2,}/)
      .map(p => stripSimpleHtmlTags(p).trim())
      .filter(Boolean);
  }

  if (paragraphs.length === 0) {
    const fallback = stripSimpleHtmlTags(rawString).trim();
    if (!fallback) return null;
    paragraphs = [fallback];
  }

  if (paragraphs.length === 1) {
    return (
      <p className="analysis-paragraph adp-body-text">
        {renderInlineFormattedText(paragraphs[0], 'prob-exp-p-0')}
      </p>
    );
  }

  return (
    <div className="analysis-paragraph-block">
      {paragraphs.map((para, idx) => (
        <p key={idx} className="analysis-paragraph adp-body-text">
          {renderInlineFormattedText(para, `prob-exp-p-${idx}`)}
        </p>
      ))}
    </div>
  );
};

const parseInputOutput = (val) => {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) {
    return {
      input: val.input !== undefined && val.input !== null ? safeStringify(val.input) : '',
      output: val.output !== undefined && val.output !== null ? safeStringify(val.output) : ''
    };
  }
  const str = String(val).trim();
  const inputRegex = /input:\s*/i;
  const outputRegex = /output:\s*/i;
  let inputVal = '';
  let outputVal = '';

  if (inputRegex.test(str) || outputRegex.test(str)) {
    const parts = str.split(outputRegex);
    if (parts.length > 1) {
      inputVal = parts[0].replace(inputRegex, '').trim();
      outputVal = parts[1].trim();
    } else {
      if (inputRegex.test(str)) {
        inputVal = str.replace(inputRegex, '').trim();
      } else if (outputRegex.test(str)) {
        outputVal = str.replace(outputRegex, '').trim();
      } else {
        inputVal = str;
      }
    }
    inputVal = inputVal.replace(/[,;.\s]+$/, '').trim();
    return { input: inputVal, output: outputVal };
  }
  return { input: str, output: '' };
};

const parseLegacyExampleString = (str, fallbackNumber) => {
  const inputRegex = /input:\s*/i;
  const outputRegex = /output:\s*/i;
  const explanationRegex = /(?:explanation|details):\s*/i;
  let inputVal = '';
  let outputVal = '';
  let explanationVal = '';
  let remaining = str.trim();
  const hasInput = inputRegex.test(remaining);
  const hasOutput = outputRegex.test(remaining);
  const hasExplanation = explanationRegex.test(remaining);

  if (hasInput || hasOutput || hasExplanation) {
    if (hasExplanation) {
      const parts = remaining.split(explanationRegex);
      explanationVal = parts.slice(1).join(' ').trim();
      remaining = parts[0].trim();
    }
    if (hasOutput) {
      const parts = remaining.split(outputRegex);
      outputVal = parts.slice(1).join(' ').trim();
      remaining = parts[0].trim();
    }
    if (hasInput) {
      inputVal = remaining.replace(inputRegex, '').trim();
    } else {
      inputVal = remaining.trim();
    }
    inputVal = inputVal.replace(/[,;.\s]+$/, '').trim();
    outputVal = outputVal.replace(/[,;.\s]+$/, '').trim();
  } else {
    explanationVal = str;
  }
  return {
    exampleNumber: fallbackNumber,
    input: inputVal,
    output: outputVal,
    explanation: explanationVal
  };
};

const parseExampleExplanation = (val) => {
  if (!val) return [];
  let list = [];
  if (Array.isArray(val)) {
    list = val.map((item, idx) => {
      if (!item) return null;
      if (typeof item === 'object') {
        return {
          exampleNumber: item.exampleNumber || item.number || (idx + 1),
          input: item.input !== undefined && item.input !== null ? safeStringify(item.input) : '',
          output: item.output !== undefined && item.output !== null ? safeStringify(item.output) : '',
          explanation: item.explanation !== undefined && item.explanation !== null ? String(item.explanation) : ''
        };
      }
      return parseLegacyExampleString(String(item), idx + 1);
    }).filter(Boolean);
  } else if (typeof val === 'object') {
    list = [{
      exampleNumber: val.exampleNumber || val.number || 1,
      input: val.input !== undefined && val.input !== null ? safeStringify(val.input) : '',
      output: val.output !== undefined && val.output !== null ? safeStringify(val.output) : '',
      explanation: val.explanation !== undefined && val.explanation !== null ? String(val.explanation) : ''
    }];
  } else {
    const str = String(val).trim();
    if (str) {
      const exampleRegex = /(?:^|\n|\s)(?:example\s*\d*[:\-.]*)/i;
      const parts = str.split(exampleRegex).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        list = parts.map((part, pIdx) => parseLegacyExampleString(part, pIdx + 1));
      } else {
        list = [parseLegacyExampleString(str, 1)];
      }
    }
  }
  return list.filter(ex => ex && (ex.input || ex.output || ex.explanation));
};

const parseExplanationPoints = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(v => typeof v === 'string' ? v.trim() : safeStringify(v)).filter(Boolean);
  }
  if (typeof val === 'object') {
    return [safeStringify(val)];
  }
  const str = String(val).trim();
  const lines = str.split(/\r?\n/);
  let result = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const subParts = line.split(/(?:\s|^)(?:[-•*]|\d+\.)\s+/).map(p => p.trim()).filter(Boolean);
    if (subParts.length > 0) {
      result.push(...subParts);
    }
  }
  return result;
};

const inferModeLabel = (requestedSections = []) => {
  if (!requestedSections || requestedSections.length === 0) return 'Complete Solution';
  if (requestedSections.includes('hints') && !requestedSections.includes('problemExplanation')) return 'Help Me Start';
  if (requestedSections.includes('problemExplanation') && requestedSections.length <= 5) return 'Understand the Problem';
  if (requestedSections.includes('comparison') && !requestedSections.includes('userCodeReview')) return 'Build the Solution';
  if (requestedSections.includes('userCodeReview') && !requestedSections.includes('hints')) return 'Review My Code';
  return 'Complete Solution';
};

const inferModeDescription = (modeLabel) => {
  const descs = {
    'Help Me Start': 'Get unstuck and understand the core idea',
    'Understand the Problem': 'Break down the problem clearly',
    'Build the Solution': 'Walk through multiple approaches',
    'Review My Code': 'Analyse and improve your solution',
    'Complete Solution': 'Full end-to-end explanation',
    'Pattern + Hints': 'Guided pattern recognition',
    'Quick Analysis': 'High-level explanation with key insights',
  };
  return descs[modeLabel] || null;
};

const inferDepthLabel = (requestedSections = []) => {
  if (!requestedSections || requestedSections.length === 0) return 'Complete';
  if (requestedSections.length <= 3) return 'Quick Analysis';
  if (requestedSections.length <= 6) return 'Focused';
  return 'Deep Dive';
};

const inferDepthDescription = (depth) => {
  const descs = {
    'Quick Analysis': 'High-level explanation with key insights',
    'Focused': 'Targeted sections based on your request',
    'Deep Dive': 'Comprehensive multi-section walkthrough',
    'Complete': 'Full analysis covering all sections',
  };
  return descs[depth] || null;
};

// Small pale-green icon tile for section headings
const SectionIcon = ({ icon: Icon, color = '#168B62', bg = '#EAF7F1' }) => (
  <div style={{
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }}>
    <Icon size={16} style={{ color }} />
  </div>
);

// Open document-style section wrapper
const LessonSection = ({ id, icon, iconColor = '#168B62', iconBg = '#EAF7F1', title, children }) => (
  <section id={id} className="adp-lesson-section">
    <div className="adp-section-head">
      <SectionIcon icon={icon} color={iconColor} bg={iconBg} />
      <h2 className="adp-section-title">{title}</h2>
    </div>
    <div className="adp-section-body">
      {children}
    </div>
  </section>
);

const AnalysisDetailPage = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  const [loadingStates, setLoadingStates] = useState({});
  const [errorStates, setErrorStates] = useState({});
  const [expandedStates, setExpandedStates] = useState({});

  const handleGenerateCode = async (idx) => {
    const stateKey = `${idx}-code`;
    if (loadingStates[stateKey]) return;

    setLoadingStates((prev) => ({ ...prev, [stateKey]: true }));
    setErrorStates((prev) => ({ ...prev, [stateKey]: '' }));

    try {
      const data = await generateApproachCode(analysisId, idx);
      const updatedApproach = data?.approach || data;

      setAnalysis((prevAnalysis) => {
        if (!prevAnalysis) return prevAnalysis;
        const newApproaches = [...(prevAnalysis.result?.approaches || [])];
        newApproaches[idx] = {
          ...newApproaches[idx],
          ...updatedApproach
        };
        return {
          ...prevAnalysis,
          result: {
            ...prevAnalysis.result,
            approaches: newApproaches
          }
        };
      });
    } catch (err) {
      setErrorStates((prev) => ({ ...prev, [stateKey]: getApiErrorMessage(err) }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, [stateKey]: false }));
    }
  };

  const handleGenerateDryRun = async (idx) => {
    const stateKey = `${idx}-dryRun`;
    if (loadingStates[stateKey]) return;

    setLoadingStates((prev) => ({ ...prev, [stateKey]: true }));
    setErrorStates((prev) => ({ ...prev, [stateKey]: '' }));

    try {
      const data = await generateApproachDryRun(analysisId, idx);
      const updatedApproach = data?.approach || data;

      setAnalysis((prevAnalysis) => {
        if (!prevAnalysis) return prevAnalysis;
        const newApproaches = [...(prevAnalysis.result?.approaches || [])];
        newApproaches[idx] = {
          ...newApproaches[idx],
          ...updatedApproach
        };
        return {
          ...prevAnalysis,
          result: {
            ...prevAnalysis.result,
            approaches: newApproaches
          }
        };
      });
    } catch (err) {
      setErrorStates((prev) => ({ ...prev, [stateKey]: getApiErrorMessage(err) }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, [stateKey]: false }));
    }
  };


  const storageKey = `algomentor-analysis-reveal-${analysisId}`;

  const [solutionRevealed, setSolutionRevealed] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return !!JSON.parse(cached).solutionRevealed;
      }
    } catch (e) {}
    return false;
  });

  const [revealedLevel, setRevealedLevel] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return JSON.parse(cached).revealedLevel || 1;
      }
    } catch (e) {}
    return 1;
  });

  const saveState = (level, solRevealed) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ revealedLevel: level, solutionRevealed: solRevealed }));
    } catch (e) {}
  };

  const [followUps, setFollowUps] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [followUpMode, setFollowUpMode] = useState('explain');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState('');
  const [selectedFollowUpQuestion, setSelectedFollowUpQuestion] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    let pollingInterval = null;

    const fetchAnalysisAndFollowUps = async () => {
      if (!analysis) {
        setIsLoading(true);
      }
      setError('');
      try {
        const data = await getAnalysisById(analysisId);
        setAnalysis(data);

        if (data && data.status === 'completed') {
          const history = await getAnalysisFollowUps(analysisId);
          setFollowUps(history || []);
          if (pollingInterval) clearInterval(pollingInterval);
        } else if (data && data.status === 'failed') {
          if (pollingInterval) clearInterval(pollingInterval);
        }
      } catch (err) {
        setError(getApiErrorMessage(err));
        if (pollingInterval) clearInterval(pollingInterval);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysisAndFollowUps();

    if (!analysis || (analysis.status === 'queued' || analysis.status === 'processing')) {
      pollingInterval = setInterval(() => {
        fetchAnalysisAndFollowUps();
      }, 3000);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [analysisId, analysis?.status]);

  const handleAskMentor = async (e) => {
    e.preventDefault();

    const typedQuestion = newQuestion.trim();
    const selectedQuestion = selectedFollowUpQuestion?.trim() || '';
    // Prefer the custom typed question if it is non-empty; otherwise use the selected option.
    const finalQuestion = typedQuestion || selectedQuestion;

    if (!finalQuestion) {
      setValidationError('Select a suggested question or type your own question.');
      return;
    }

    setIsSubmittingFollowUp(true);
    setFollowUpError('');
    setValidationError('');

    try {
      const result = await createAnalysisFollowUp(analysisId, {
        question: finalQuestion,
        mode: followUpMode,
      });
      setFollowUps((prev) => [...prev, result]);
      setNewQuestion('');
      setSelectedFollowUpQuestion('');
    } catch (err) {
      setFollowUpError(getApiErrorMessage(err));
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleChipClick = (questionText, targetMode) => {
    setSelectedFollowUpQuestion(questionText);
    setFollowUpMode(targetMode);
    setNewQuestion(''); // Clear custom typed text when a recommended option is selected
    setValidationError('');
  };

  const handlePresetModeSelect = (targetMode) => {
    setFollowUpMode(targetMode);
    setSelectedFollowUpQuestion(PRESET_MODE_QUESTIONS[targetMode] || '');
    setNewQuestion(''); // Clear custom typed text when a preset action chip is selected
    setValidationError('');
  };

  const handleRetryAnalysis = async () => {
    if (!analysis?.problem) return;
    setIsRetrying(true);
    setRetryError('');
    try {
      const newAnalysis = await startProblemAnalysis(analysis.problem);
      navigate(`/analyses/${newAnalysis._id}`);
    } catch (err) {
      setRetryError(getApiErrorMessage(err));
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loader-container" style={{ minHeight: '50vh' }}>
        <Loader text="Retrieving AI mentor report..." />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="adp-page container" style={{ paddingBottom: '80px' }}>
        <div className="adp-header" style={{ border: 'none', padding: '0 0 20px 0', borderBottom: '1px solid var(--border)', borderRadius: 0, marginBottom: '24px' }}>
          <div className="adp-header-top-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Link to="/problems" className="adp-back-link">
              <ArrowLeft size={14} /> Back to My Analyses
            </Link>
            <Link to="/problems/new" className="btn btn-primary btn-sm">
              Analyze Another Problem
            </Link>
          </div>
        </div>
        <FormError message={error || 'Failed to locate analysis.'} />
      </div>
    );
  }

  const result = analysis.result || {};
  const status = (analysis.status || '').toLowerCase();
  const totalHints = result.hints?.length || 0;

  const getComplexityRows = () => {
    if (result.complexities && result.complexities.length > 0) {
      return result.complexities.map(comp => ({
        approach: comp.approach,
        timeComplexity: comp.timeComplexity,
        timeReason: comp.timeReason || 'Standard implementation analysis',
        spaceComplexity: comp.spaceComplexity,
        spaceReason: comp.spaceReason || 'Auxiliary space allocation details',
      }));
    }
    if (result.approaches && result.approaches.length > 0) {
      return result.approaches.map(ap => ({
        approach: ap.name,
        timeComplexity: ap.timeComplexity,
        timeReason: ap.intuition || 'Asymptotic bound based on algorithm steps',
        spaceComplexity: ap.spaceComplexity,
        spaceReason: 'In-place processing space requirements',
      }));
    }
    return [];
  };

  const complexityRows = getComplexityRows();

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

  const PRESET_MODE_QUESTIONS = {
    explain: 'Explain this analysis in simpler words.',
    hint: 'Give me the next progressive hint without revealing the complete solution.',
    improve: 'How can I improve my current approach?',
    edgeCase: 'Which important edge cases am I missing?',
    interview: 'How should I explain this solution in an interview?',
  };

  const getModeLabel = (modeVal) => {
    const labels = {
      explain: 'Explain simply',
      hint: 'Next Hint',
      improve: 'Improve Approach',
      edgeCase: 'Edge Case analysis',
      interview: 'Interview Coach',
    };
    return labels[modeVal] || modeVal;
  };

  // Rail data derived from real analysis data
  const modeLabel = inferModeLabel(analysis.requestedSections);
  const modeDesc = inferModeDescription(modeLabel);
  const depthLabel = inferDepthLabel(analysis.requestedSections);
  const depthDesc = inferDepthDescription(depthLabel);
  const patternName = result.pattern?.name;
  const patternReason = result.pattern?.reason;
  const confidence = result.confidence || result.pattern?.confidence || null;
  const revisionStatus = analysis.revisionStatus || null;
  const savedStatus = analysis.saved || analysis.isSaved || null;
  const nextAction = result.nextRecommendedAction || null;

  // Confidence levels styled in desaturated / primary greens
  const confidenceColors = {
    'very-low': '#5C6E58',
    low: '#708274',
    medium: '#4D6B53',
    high: '#168B62',
    'very-high': '#064E3B'
  };
  const confidenceLabels = {
    'very-low': 'Very Low',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    'very-high': 'Very High'
  };

  const getConfidenceLevel = (conf) => {
    if (!conf) return null;
    const lower = String(conf).toLowerCase().trim();
    if (lower === 'high' || lower === 'very high' || lower === 'very-high') return 'high';
    if (lower === 'medium') return 'medium';
    if (lower === 'low') return 'low';
    if (lower === 'very low' || lower === 'very-low') return 'very-low';
    return null;
  };

  const confidenceKey = getConfidenceLevel(confidence);

  const getApproachAccent = (category) => {
    const lower = (category || '').toLowerCase();
    if (lower.includes('optimal') || lower.includes('recommended')) {
      return {
        border: '#064E3B', // deep forest green
        bg: '#EAF5EE', // very soft dark green
        label: '#064E3B',
        tag: 'Optimal Approach'
      };
    }
    if (lower.includes('better') || lower.includes('improved')) {
      return {
        border: '#059669', // medium emerald
        bg: '#ECFDF5', // light emerald/mint
        label: '#047857',
        tag: 'Better Approach'
      };
    }
    // Brute force / other
    return {
      border: '#708274', // muted olive/sage
      bg: '#F2F5F3', // soft sage bg
      label: '#4A5D4E',
      tag: category || 'Brute Force'
    };
  };

  // Safe checks for rendering empty elements/headings
  const validConstraints = result.constraints?.filter(c => c && (typeof c === 'string' ? c.trim() : c.constraint?.trim())) || [];
  const validExamples = parseExampleExplanation(result.exampleExplanation);
  const parsedIO = parseInputOutput(result.inputOutput);
  const validEdgeCases = result.edgeCases?.filter(ec => ec && (typeof ec === 'string' ? ec.trim() : ec.case?.trim())) || [];
  const validMissingEdgeCases = result.missingEdgeCases?.filter(ec => ec && ec.case?.trim()) || [];
  const validHints = result.hints?.filter(h => h && h.hint?.trim()) || [];
  const validApproaches = result.approaches?.filter(ap => ap && ap.name?.trim()) || [];
  const validComparison = result.comparison?.filter(row => row && row.approach?.trim()) || [];

  const hasApproachImprovement = result.approachImprovement && (
    result.approachImprovement.currentStrengths?.length > 0 ||
    result.approachImprovement.bottlenecks?.length > 0 ||
    result.approachImprovement.unnecessaryWork?.length > 0 ||
    result.approachImprovement.nextImprovement?.trim() ||
    result.approachImprovement.improvedApproach?.trim() ||
    result.approachImprovement.patternToLearn?.trim() ||
    result.approachImprovement.questionsToAsk?.length > 0
  );

  const hasUserCodeReview = result.userCodeReview && (
    result.userCodeReview.summary?.trim() ||
    result.userCodeReview.strengths?.length > 0 ||
    result.userCodeReview.bugs?.length > 0 ||
    result.userCodeReview.missedEdgeCases?.length > 0 ||
    result.userCodeReview.improvements?.length > 0 ||
    result.userCodeReview.correctedCode?.trim()
  );

  const hasLegacyPseudocode = result.pseudocode && (
    Array.isArray(result.pseudocode) ? result.pseudocode.length > 0 : String(result.pseudocode).trim().length > 0
  );
  const hasLegacyCodes = result.codes && result.codes.length > 0 && result.codes.some(c => c.code?.trim());
  const hasLegacyComplexities = result.complexities && result.complexities.length > 0;
  const hasLegacyDryRun = result.dryRun && (
    typeof result.dryRun === 'string' ||
    Array.isArray(result.dryRun) ||
    (typeof result.dryRun === 'object' && (result.dryRun.steps?.length > 0 || result.dryRun.input || result.dryRun.output))
  );

  const getComparisonColumns = (comparisonData) => {
    const hasField = (fieldNames) => comparisonData.some(row => fieldNames.some(f => row[f] !== undefined && row[f] !== null));

    const cols = [];
    cols.push({ header: 'Approach', render: (row) => <strong>{renderAiText(row.approach, 'comp-app', true)}</strong> });

    if (hasField(['mainIdea', 'idea'])) {
      cols.push({ header: 'Main Idea', render: (row) => renderAiText(row.mainIdea || row.idea || '', 'comp-idea', true) });
    }
    if (hasField(['timeComplexity'])) {
      cols.push({ header: 'Time', render: (row) => <code className="adp-inline-code">{renderAiText(row.timeComplexity, 'comp-tc', true)}</code> });
    }
    if (hasField(['spaceComplexity'])) {
      cols.push({ header: 'Space', render: (row) => <code className="adp-inline-code">{renderAiText(row.spaceComplexity, 'comp-sc', true)}</code> });
    }
    if (hasField(['advantages'])) {
      cols.push({
        header: 'Advantages',
        render: (row) => renderAiText(row.advantages || [], 'comp-advantages')
      });
    }
    if (hasField(['limitations', 'disadvantages'])) {
      cols.push({
        header: 'Limitations',
        render: (row) => renderAiText(row.limitations || row.disadvantages || [], 'comp-limitations')
      });
    }
    if (hasField(['recommendedUse', 'interviewSuitability'])) {
      cols.push({ header: 'Best Used When', render: (row) => renderAiText(row.recommendedUse || row.interviewSuitability || '', 'comp-rec', true) });
    }
    return cols;
  };

  const renderDryRun = (dryRun) => {
    if (!dryRun) return null;

    let input = '';
    let steps = [];
    let output = '';

    if (typeof dryRun === 'string') {
      try {
        const parsed = JSON.parse(dryRun);
        if (parsed && typeof parsed === 'object') {
          return renderDryRun(parsed);
        }
      } catch (e) {}

      return (
        <div className="adp-dryrun-container">
          <p className="adp-body-text" style={{ whiteSpace: 'pre-wrap' }}>{dryRun}</p>
        </div>
      );
    }

    if (Array.isArray(dryRun)) {
      steps = dryRun;
    } else if (typeof dryRun === 'object') {
      input = dryRun.input || '';
      output = dryRun.output || '';
      if (dryRun.steps) {
        if (Array.isArray(dryRun.steps)) {
          steps = dryRun.steps;
        } else if (typeof dryRun.steps === 'string') {
          steps = dryRun.steps.split('\n').filter(Boolean);
        }
      }
    }

    if (!input && steps.length === 0 && !output) {
      return null;
    }

    return (
      <div className="adp-dryrun-container">
        {input && (
          <div className="adp-dryrun-row">
            <strong className="adp-dryrun-label">Input:</strong>
            <code className="adp-dryrun-code">{safeStringify(input)}</code>
          </div>
        )}

        {steps.length > 0 && (
          <div className="adp-dryrun-steps-section">
            <strong className="adp-dryrun-label" style={{ display: 'block', marginBottom: '8px' }}>Execution Trace:</strong>
            <div className="adp-dryrun-steps-list">
              {steps.map((step, sIdx) => (
                <div key={sIdx} className="adp-dryrun-step-item">
                  <span className="adp-dryrun-step-number">{sIdx + 1}</span>
                  <span className="adp-dryrun-step-text">{safeStringify(step)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {output && (
          <div className="adp-dryrun-row adp-dryrun-output-row">
            <strong className="adp-dryrun-label">Output:</strong>
            <code className="adp-dryrun-code-highlight">{safeStringify(output)}</code>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="adp-page container" style={{ paddingBottom: '80px' }}>

      {/* ── Polished Page Header ── */}
      <header className="adp-header">
        <div className="adp-header-top-nav">
          <Link to="/problems" className="adp-back-link">
            <ArrowLeft size={14} /> Back to My Analyses
          </Link>
          {analysis.problem && (
            <Link
              to={typeof analysis.problem === 'object' ? `/problems/${analysis.problem._id}` : `/problems/${analysis.problem}`}
              className="adp-back-link"
            >
              <BookOpen size={14} /> View Details
            </Link>
          )}
          <Link to="/problems/new" className="adp-header-primary-btn">
            Analyze Another Problem
          </Link>
        </div>
        <div className="adp-header-body">
          <div className="adp-header-title-row">
            <h1 className="adp-problem-title">
              {analysis.inputSnapshot?.title || 'Untitled DSA Problem'}
            </h1>
            {(() => {
              const norm = (analysis.status || '').toLowerCase();
              let label = 'Unknown';
              let bg = 'var(--bg-soft)';
              let color = 'var(--primary)';
              let dot = null;
              if (norm === 'completed') {
                label = 'Completed';
                bg = 'var(--primary-soft)';
                color = 'var(--primary)';
                dot = <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />;
              } else if (norm === 'queued' || norm === 'processing') {
                label = norm === 'queued' ? 'Queued' : 'Processing';
                bg = '#E2EFE9';
                color = '#2E7D5F';
              } else if (norm === 'failed') {
                label = 'Failed';
                bg = 'var(--danger-soft)';
                color = 'var(--danger)';
                dot = <AlertCircle size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />;
              }
              return (
                <span className="adp-status-badge" style={{ backgroundColor: bg, color, border: `1px solid ${color}33` }}>
                  {dot}{label}
                </span>
              );
            })()}
          </div>
          <div className="adp-meta-strip">
            {analysis.inputSnapshot?.language && (
              <span className="adp-meta-item">
                <Code2 size={13} />
                <span>{getLanguageLabel(analysis.inputSnapshot.language)}</span>
              </span>
            )}
            {modeLabel && (
              <span className="adp-meta-item">
                <Target size={13} />
                <span>Mode: {modeLabel}</span>
              </span>
            )}
            {analysis.createdAt && (
              <span className="adp-meta-item">
                <Clock size={13} />
                <span>Created: {new Date(analysis.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </span>
            )}
            {analysis.updatedAt && (
              <span className="adp-meta-item">
                <CheckCircle2 size={13} />
                <span>Completed: {new Date(analysis.updatedAt).toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Failed state card (polished green treatment) ── */}
      {status === 'failed' ? (
        <div className="analysis-failed-state-wrapper" style={{ marginTop: '24px', width: '100%' }}>
          <div
            className="analysis-failed-state-card"
            style={{
              padding: '32px',
              backgroundColor: 'var(--danger-soft)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--danger)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)'
              }}
            >
              <AlertCircle size={24} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  color: 'var(--danger)',
                  margin: 0
                }}
              >
                Analysis could not be completed
              </h2>

              <p
                style={{
                  fontSize: '14.5px',
                  color: 'var(--text-primary)',
                  maxWidth: '600px',
                  margin: '0 auto',
                  lineHeight: '1.6',
                  fontWeight: '500'
                }}
              >
                {getFriendlyErrorMessage(analysis.errorMessage)}
              </p>
            </div>

            {retryError && (
              <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                <FormError message={retryError} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleRetryAnalysis}
                disabled={isRetrying}
                className="btn btn-primary"
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '120px',
                  justifyContent: 'center',
                  backgroundColor: '#168B62',
                  borderColor: '#168B62',
                  color: '#ffffff'
                }}
              >
                {isRetrying ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px', margin: 0, borderTopColor: '#ffffff' }}></div>
                    <span>Retrying...</span>
                  </>
                ) : (
                  'Try Again'
                )}
              </button>

              <Link
                to="/problems"
                className="btn btn-secondary"
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#EAF7F1',
                  borderColor: '#BFE5DF',
                  color: '#168B62'
                }}
              >
                Back to My Analyses
              </Link>

              <Link
                to="/problems/new"
                className="btn btn-secondary"
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#EAF7F1',
                  borderColor: '#BFE5DF',
                  color: '#168B62'
                }}
              >
                Analyze Another Problem
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ── Main workspace (queued / processing / completed) ── */
        <div className="adp-workspace">

          {/* ── Processing / queued spinner ── */}
          {(status === 'queued' || status === 'processing') && (
            <div
              className="analysis-status-card"
              style={{
                padding: '48px 32px',
                textAlign: 'center',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <div
                className="spinner"
                style={{
                  width: '32px',
                  height: '32px',
                  borderWidth: '3px',
                  margin: 0
                }}
              ></div>
              <h3
                className="status-card-title"
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}
              >
                Building your personalised lesson…
              </h3>
            </div>
          )}

          {/* ── Completed two-column layout ── */}
          {status === 'completed' && (
            <div className="adp-completed-layout">

              {/* ──── Main lesson column (70%) ──── */}
              <main className="adp-lesson-col">

                {/* 1. Problem Explanation */}
                {Boolean(result.problemExplanation) && (
                  <LessonSection
                    id="problemExplanation"
                    icon={Target}
                    title="Problem Understanding"
                  >
                    {renderAiText(result.problemExplanation, 'prob-exp')}
                  </LessonSection>
                )}

                {/* 2. Input and Output */}
                {parsedIO && (parsedIO.input || parsedIO.output) && (
                  <LessonSection
                    id="inputOutput"
                    icon={AlignLeft}
                    title="Input and Output"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {parsedIO.input && (
                        <div className="adp-io-box" style={{ width: '100%' }}>
                          <span className="adp-io-label" style={{ color: '#168B62' }}>Input</span>
                          <div style={{ marginTop: '6px' }}>
                            {renderAiText(parsedIO.input, 'io-input')}
                          </div>
                        </div>
                      )}
                      {parsedIO.output && (
                        <div className="adp-io-box" style={{ width: '100%' }}>
                          <span className="adp-io-label" style={{ color: '#15803D' }}>Output</span>
                          <div style={{ marginTop: '6px' }}>
                            {renderAiText(parsedIO.output, 'io-output')}
                          </div>
                        </div>
                      )}
                    </div>
                  </LessonSection>
                )}

                {/* 3. Example Explanation */}
                {validExamples.length > 0 && (
                  <LessonSection
                    id="examples"
                    icon={FileCode}
                    title="Example Explanation"
                  >
                    <div className="adp-examples-grid">
                      {validExamples.map((ex, idx) => (
                        <div key={idx} className="adp-example-card">
                          {ex.input && (
                            <div className="adp-example-row">
                              <span className="adp-example-field">Input</span>
                              <span className="adp-example-value">{renderAiText(ex.input, `ex-input-${idx}`, true)}</span>
                            </div>
                          )}
                          {ex.output && (
                            <div className="adp-example-row">
                              <span className="adp-example-field">Output</span>
                              <span className="adp-example-value">{renderAiText(ex.output, `ex-output-${idx}`, true)}</span>
                            </div>
                          )}
                          {ex.explanation && (
                            <div className="adp-example-row">
                              <span className="adp-example-field">Explanation</span>
                              <div className="adp-example-value" style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {renderAiText(ex.explanation, `ex-explanation-${idx}`)}
                              </div>
                            </div>
                          )}
                          {!ex.input && !ex.output && !ex.explanation && ex.exampleNumber && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Example {ex.exampleNumber}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </LessonSection>
                )}

                {/* 4. Constraints */}
                {validConstraints.length > 0 && (
                  <LessonSection
                    id="constraints"
                    icon={Hash}
                    title="Constraints"
                  >
                    <ul className="adp-bullet-list">
                      {validConstraints.map((c, idx) => (
                        <li key={idx}>
                          {renderAiText(c.constraint || c, `constraint-${idx}`, true)}
                          {c.implication && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                              {' — '}{renderAiText(c.implication, `constraint-implication-${idx}`, true)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </LessonSection>
                )}

                {/* 5. Edge Cases */}
                {validEdgeCases.length > 0 && (
                  <LessonSection
                    id="edgeCases"
                    icon={AlertTriangle}
                    iconColor="#4D6B53"
                    iconBg="#F2F7F3"
                    title="Edge Cases"
                  >
                    <ul className="adp-bullet-list">
                      {validEdgeCases.map((ec, idx) => (
                        <li key={idx}>
                          <strong>{renderAiText(ec.case || ec, `edge-case-${idx}`, true)}</strong>
                          {ec.reason && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                              {' — '}{renderAiText(ec.reason, `edge-case-reason-${idx}`, true)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </LessonSection>
                )}

                {/* 6. Missing Edge Cases */}
                {validMissingEdgeCases.length > 0 && (
                  <LessonSection
                    id="missingedgecases"
                    icon={AlertTriangle}
                    iconColor="#3E5A44"
                    iconBg="#ECF2ED"
                    title="Missed Edge Cases"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {validMissingEdgeCases.map((ec, idx) => (
                        <div key={idx} className="adp-missing-ec-row">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '14px', color: '#3E5A44' }}>
                              Case {idx + 1}: {renderAiText(ec.case, `missing-ec-${idx}`, true)}
                            </strong>
                            {ec.testInput && (
                              <code className="adp-inline-code" style={{ fontSize: '11px' }}>
                                Input: {renderAiText(safeStringify(ec.testInput), `missing-ec-input-${idx}`, true)}
                              </code>
                            )}
                          </div>
                          {ec.whyItMatters && (
                            <p className="adp-body-text" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                              <strong>Why it matters:</strong> {renderAiText(ec.whyItMatters, `missing-ec-why-${idx}`, true)}
                            </p>
                          )}
                          {ec.howItBreaksCurrentApproach && (
                            <p className="adp-body-text" style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#3E5A44' }}>
                              <strong>How it breaks:</strong> {renderAiText(ec.howItBreaksCurrentApproach, `missing-ec-breaks-${idx}`, true)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </LessonSection>
                )}

                {/* 7. DSA Pattern */}
                {result.pattern && (result.pattern.name?.trim() || result.pattern.reason?.trim()) && (
                  <LessonSection
                    id="pattern"
                    icon={GitBranch}
                    title="Pattern"
                  >
                    {result.pattern.name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span className="adp-pattern-chip">{renderAiText(result.pattern.name, 'pattern-name', true)}</span>
                      </div>
                    )}
                    {result.pattern.reason && (
                      <div style={{ marginBottom: '16px' }}>
                        {renderAiText(result.pattern.reason, 'pattern-reason')}
                      </div>
                    )}
                    {(result.pattern.clues?.length > 0 || result.pattern.whyItFits) && (
                      <div className="adp-pattern-grid">
                        {result.pattern.clues?.length > 0 && (
                          <div className="adp-pattern-col">
                            <span className="adp-pattern-col-label" style={{ color: '#168B62' }}>Clues</span>
                            <div style={{ marginTop: '6px' }}>
                              {renderAiText(result.pattern.clues, 'pattern-clues')}
                            </div>
                          </div>
                        )}
                        {result.pattern.whyItFits && (
                          <div className="adp-pattern-col">
                            <span className="adp-pattern-col-label" style={{ color: '#15803D' }}>Why It Fits</span>
                            <div style={{ marginTop: '6px' }}>
                              {renderAiText(result.pattern.whyItFits, 'pattern-whyitfits')}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </LessonSection>
                )}

                {/* 8. Progressive Hints */}
                {validHints.length > 0 && (
                  <LessonSection
                    id="hints"
                    icon={Lightbulb}
                    iconColor="#4D6B53"
                    iconBg="#F2F7F3"
                    title="Hints"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Reveal progressively to build intuition.
                      </p>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#168B62' }}>
                        {Math.min(revealedLevel, totalHints)} / {totalHints} revealed
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[...validHints]
                        .sort((a, b) => a.level - b.level)
                        .map((h, hIdx) => {
                          const level = h.level;
                          const isRevealed = level <= revealedLevel;
                          let hintLabel = 'Gentle nudge';
                          if (level === 2) hintLabel = 'Stronger direction';
                          if (level === 3) hintLabel = 'Almost there';
                          return (
                            <div key={level} className="adp-hint-step">
                              <div className="adp-hint-indicator-col">
                                <div className={`adp-hint-circle ${isRevealed ? 'active' : ''}`}>
                                  {level}
                                </div>
                                {hIdx < validHints.length - 1 && <div className="adp-hint-line" />}
                              </div>
                              <div className="adp-hint-content-col">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                  <span className="adp-hint-title" style={{ color: isRevealed ? '#168B62' : 'var(--text-primary)' }}>Hint {level}</span>
                                  {!isRevealed && (
                                    <button
                                      type="button"
                                      onClick={() => { setRevealedLevel(level); saveState(level, solutionRevealed); }}
                                      className="adp-hint-reveal-btn"
                                    >
                                      Reveal {hintLabel}
                                    </button>
                                  )}
                                </div>
                                <div style={{ marginTop: '6px' }}>
                                  {isRevealed ? (
                                    renderAiText(h.hint, `hint-${level}`)
                                  ) : (
                                    <p className="adp-hint-placeholder">Hidden — reveal when ready.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </LessonSection>
                )}

                {/* 9. Approaches */}
                {validApproaches.length > 0 && (
                  <LessonSection
                    id="approaches"
                    icon={Layers}
                    title="Approaches"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {validApproaches.map((ap, idx) => {
                        const acc = getApproachAccent(ap.category);
                        const isCodeLoading = loadingStates[`${idx}-code`] || ap.codeGenerationStatus === 'generating';
                        const isDryRunLoading = loadingStates[`${idx}-dryRun`] || ap.dryRunGenerationStatus === 'generating';

                        const hasCode = ap.code && ap.code.trim().length > 0;

                        const hasDryRun = ap.dryRun && (
                          typeof ap.dryRun === 'string' ||
                          Array.isArray(ap.dryRun) ||
                          (typeof ap.dryRun === 'object' && (ap.dryRun.steps?.length > 0 || ap.dryRun.input || ap.dryRun.output))
                        );

                        return (
                          <div key={idx} className="adp-approach-card" style={{ borderColor: acc.border, backgroundColor: acc.bg }}>
                            {/* 1. Approach category badge */}
                            <div style={{ marginBottom: '6px' }}>
                              <span className="adp-approach-tag" style={{ backgroundColor: `${acc.border}1A`, color: acc.label }}>
                                {acc.tag}
                              </span>
                            </div>

                            {/* 2. Approach name */}
                            <h3 className="adp-approach-title" style={{ color: acc.label, margin: '0 0 10px 0', fontSize: '16px', fontWeight: '700' }}>
                              {ap.name}
                            </h3>

                            {/* 3. Intuition / Explanation */}
                            {ap.intuition && (
                              <div style={{ marginBottom: '12px' }}>
                                <strong>Intuition:</strong> {renderAiText(ap.intuition, `approach-intuition-${idx}`, true)}
                              </div>
                            )}
                            {ap.explanation && !ap.intuition && (
                              <div style={{ marginBottom: '12px' }}>
                                {renderAiText(ap.explanation, `approach-explanation-${idx}`)}
                              </div>
                            )}

                            {/* 4. Numbered steps */}
                            {ap.steps && ap.steps.length > 0 && (
                              <div style={{ marginBottom: '12px' }}>
                                <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>Steps:</strong>
                                <ol className="adp-ordered-list">
                                  {ap.steps.map((step, sIdx) => (
                                    <li key={sIdx}>{renderAiText(step, `approach-step-${idx}-${sIdx}`, true)}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {/* 5. Pseudocode */}
                            {(() => {
                              const pseudoStr = getPseudocodeString(ap.pseudocode);
                              if (!pseudoStr.trim()) return null;
                              return (
                                <div style={{ marginBottom: '12px' }}>
                                  <span className="adp-subheading">Pseudocode</span>
                                  <div className="adp-pseudocode-wrapper">
                                    <pre className="adp-pseudocode-pre">
                                      <code>{pseudoStr}</code>
                                    </pre>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 6. Time and Space Complexity */}
                            {(ap.timeComplexity || ap.spaceComplexity) && (
                              <div className="adp-complexity-cards-container">
                                {ap.timeComplexity && (
                                  <div className="adp-complexity-card" style={{ borderColor: `${acc.border}33` }}>
                                    <span className="adp-complexity-label">Time Complexity</span>
                                    <code className="adp-complexity-value" style={{ color: acc.label }}>{ap.timeComplexity}</code>
                                  </div>
                                )}
                                {ap.spaceComplexity && (
                                  <div className="adp-complexity-card" style={{ borderColor: `${acc.border}33` }}>
                                    <span className="adp-complexity-label">Space Complexity</span>
                                    <code className="adp-complexity-value" style={{ color: acc.label }}>{ap.spaceComplexity}</code>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 7. Action buttons (visually grouped, same height, etc.) */}
                            <div className="adp-btn-group">
                              {/* Code action button */}
                              {hasCode ? (
                                <button
                                  type="button"
                                  className="adp-action-btn-grouped secondary"
                                  onClick={() => setExpandedStates(prev => ({ ...prev, [`${idx}-code`]: !prev[`${idx}-code`] }))}
                                >
                                  {expandedStates[`${idx}-code`] ? 'Hide Full Code' : `Show Full Code${ap.language ? ` (${getLanguageLabel(ap.language)})` : ''}`}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="adp-action-btn-grouped primary"
                                  disabled={isCodeLoading}
                                  onClick={() => handleGenerateCode(idx)}
                                >
                                  {isCodeLoading ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <span className="spinner" style={{ width: '12px', height: '12px', margin: 0, borderTopColor: '#ffffff' }}></span>
                                      Generating Code...
                                    </span>
                                  ) : (
                                    'Generate Full Code'
                                  )}
                                </button>
                              )}

                              {/* Dry run action button */}
                              {hasDryRun ? (
                                <button
                                  type="button"
                                  className="adp-action-btn-grouped secondary"
                                  onClick={() => setExpandedStates(prev => ({ ...prev, [`${idx}-dryRun`]: !prev[`${idx}-dryRun`] }))}
                                >
                                  {expandedStates[`${idx}-dryRun`] ? 'Hide Dry Run' : 'Show Dry Run'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="adp-action-btn-grouped primary"
                                  disabled={isDryRunLoading}
                                  onClick={() => handleGenerateDryRun(idx)}
                                >
                                  {isDryRunLoading ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <span className="spinner" style={{ width: '12px', height: '12px', margin: 0, borderTopColor: '#ffffff' }}></span>
                                      Generating Dry Run...
                                    </span>
                                  ) : (
                                    'Generate Dry Run'
                                  )}
                                </button>
                              )}
                            </div>

                            {/* 8. Expanded full code */}
                            {hasCode && expandedStates[`${idx}-code`] && (
                              <div style={{ marginTop: '16px' }}>
                                <CodeBlock code={ap.code} language={ap.language || analysis.inputSnapshot?.language} />
                              </div>
                            )}

                            {/* 9. Expanded dry run */}
                            {hasDryRun && expandedStates[`${idx}-dryRun`] && (
                              renderDryRun(ap.dryRun)
                            )}

                            {/* 10. Inline code generation error */}
                            {errorStates[`${idx}-code`] && (
                              <div style={{
                                color: 'var(--danger)',
                                fontSize: '12.5px',
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                backgroundColor: 'var(--danger-soft)',
                                border: '1px solid rgba(22, 139, 98, 0.1)',
                                borderRadius: 'var(--radius-sm)'
                              }}>
                                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                <span>{errorStates[`${idx}-code`]}</span>
                              </div>
                            )}

                            {/* Inline dry run generation error */}
                            {errorStates[`${idx}-dryRun`] && (
                              <div style={{
                                color: 'var(--danger)',
                                fontSize: '12.5px',
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                backgroundColor: 'var(--danger-soft)',
                                border: '1px solid rgba(22, 139, 98, 0.1)',
                                borderRadius: 'var(--radius-sm)'
                              }}>
                                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                <span>{errorStates[`${idx}-dryRun`]}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </LessonSection>
                )}

                {/* 10. Approach Improvement */}
                {result.approachImprovement && hasApproachImprovement && (
                  <LessonSection
                    id="approachImprovement"
                    icon={Brain}
                    title="Approach Improvement"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {result.approachImprovement.currentStrengths?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#168B62', display: 'block', marginBottom: '5px' }}>Strengths</span>
                          {renderAiText(result.approachImprovement.currentStrengths, 'imp-strengths')}
                        </div>
                      )}
                      {result.approachImprovement.bottlenecks?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '5px' }}>Bottlenecks</span>
                          <div style={{ color: 'var(--danger)' }}>
                            {renderAiText(result.approachImprovement.bottlenecks, 'imp-bottlenecks')}
                          </div>
                        </div>
                      )}
                      {result.approachImprovement.unnecessaryWork?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#4D6B53', display: 'block', marginBottom: '5px' }}>Unnecessary work</span>
                          <div style={{ color: '#4D6B53' }}>
                            {renderAiText(result.approachImprovement.unnecessaryWork, 'imp-unnecessary')}
                          </div>
                        </div>
                      )}
                      {result.approachImprovement.nextImprovement && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Next improvement step</span>
                          {renderAiText(result.approachImprovement.nextImprovement, 'imp-next')}
                        </div>
                      )}
                      {result.approachImprovement.improvedApproach && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Recommended approach</span>
                          {renderAiText(result.approachImprovement.improvedApproach, 'imp-improved')}
                        </div>
                      )}
                      {result.approachImprovement.patternToLearn && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#15803D', display: 'block', marginBottom: '5px' }}>Pattern to study</span>
                          <div style={{ backgroundColor: '#EAF7F1', padding: '12px 14px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #15803D', fontSize: '13px', color: '#064E3B' }}>
                            {renderAiText(result.approachImprovement.patternToLearn, 'imp-pattern', true)}
                          </div>
                        </div>
                      )}
                      {result.approachImprovement.questionsToAsk?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Reflective questions</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {result.approachImprovement.questionsToAsk.map((q, idx) => (
                              <label key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                <input type="checkbox" style={{ marginTop: '3px' }} />
                                <span>{renderAiText(q, `imp-question-${idx}`, true)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </LessonSection>
                )}

                {/* 11. Comparison Section */}
                {validComparison.length > 0 && (() => {
                  const cols = getComparisonColumns(validComparison);
                  return (
                    <LessonSection
                      id="comparison"
                      icon={TrendingUp}
                      title="Approach Comparison"
                    >
                      <div className="adp-table-wrap">
                        <table className="adp-table">
                          <thead>
                            <tr>
                              {cols.map((c, i) => <th key={i}>{c.header}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {validComparison.map((row, rIdx) => {
                              const isOptimal = row.approach?.toLowerCase().includes('optimal') ||
                                                row.interviewSuitability?.toLowerCase().includes('recommended') ||
                                                row.recommendedUse?.toLowerCase().includes('recommended');
                              return (
                                <tr key={rIdx} className={isOptimal ? 'adp-table-optimal-row' : ''}>
                                  {cols.map((c, cIdx) => <td key={cIdx}>{c.render(row)}</td>)}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </LessonSection>
                  );
                })()}

                {/* 12. Interview Explanation */}
                {result.interviewExplanation?.trim() && (
                  <LessonSection
                    id="interviewExplanation"
                    icon={Award}
                    title="Interview Explanation"
                  >
                    <div className="adp-interview-callout" style={{ borderLeftColor: '#168B62', background: '#EAF7F1' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#168B62', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={12} /> How to explain in an interview
                      </span>
                      <div className="adp-body-text" style={{ marginTop: '8px', lineHeight: '1.7', color: '#064E3B' }}>
                        {renderAiText(result.interviewExplanation, 'interview-exp')}
                      </div>
                    </div>
                  </LessonSection>
                )}

                {/* 13. User Code Review, when available */}
                {result.userCodeReview && hasUserCodeReview && (
                  <LessonSection
                    id="userCodeReview"
                    icon={Brain}
                    title="User Code Review"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#FAFDFB', borderRadius: 'var(--radius-sm)', border: '1px solid #E2EFE7', fontSize: '13px' }}>
                        <span style={{ fontWeight: '600' }}>Submitted logic status</span>
                        <span style={{ fontWeight: '700', color: result.userCodeReview.isCorrect ? '#168B62' : 'var(--danger)' }}>
                          {result.userCodeReview.isCorrect ? 'Logic Correct' : 'Inefficient / Has Bugs'}
                        </span>
                      </div>
                      {result.userCodeReview.summary && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>What you did well</span>
                          {renderAiText(result.userCodeReview.summary, 'rev-summary')}
                        </div>
                      )}
                      {result.userCodeReview.strengths?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Key Strengths</span>
                          {renderAiText(result.userCodeReview.strengths, 'rev-strengths')}
                        </div>
                      )}
                      {result.userCodeReview.bugs?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '5px' }}>Problems found</span>
                          <div style={{ color: 'var(--danger)' }}>
                            {renderAiText(result.userCodeReview.bugs, 'rev-bugs')}
                          </div>
                        </div>
                      )}
                      {result.userCodeReview.missedEdgeCases?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: '5px' }}>Missed edge cases</span>
                          <div style={{ color: 'var(--danger)' }}>
                            {renderAiText(result.userCodeReview.missedEdgeCases, 'rev-missed')}
                          </div>
                        </div>
                      )}
                      {result.userCodeReview.improvements?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Improvements</span>
                          {renderAiText(result.userCodeReview.improvements, 'rev-improvements')}
                        </div>
                      )}
                      {result.userCodeReview.correctedCode && (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Corrected code</span>
                          <CodeBlock code={result.userCodeReview.correctedCode} language={analysis.inputSnapshot?.language} />
                        </div>
                      )}
                    </div>
                  </LessonSection>
                )}

                {/* 14. Legacy Pseudocode (if present) */}
                {hasLegacyPseudocode && (
                  <LessonSection
                    id="legacyPseudocode"
                    icon={Code2}
                    title="Legacy Pseudocode"
                  >
                    <div className="adp-pseudocode-wrapper">
                      <pre className="adp-pseudocode-pre">
                        <code>{getPseudocodeString(result.pseudocode)}</code>
                      </pre>
                    </div>
                  </LessonSection>
                )}

                {/* 15. Legacy Solutions (if present) */}
                {hasLegacyCodes && (
                  <LessonSection
                    id="legacyCodes"
                    icon={FileCode}
                    title="Legacy Solutions"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {result.codes.map((sol, idx) => (
                        <div key={idx}>
                          {sol.approach && (
                            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#168B62', marginBottom: '8px' }}>
                              {renderAiText(sol.approach, `legacy-sol-app-${idx}`, true)}
                            </h4>
                          )}
                          <CodeBlock code={sol.code} language={sol.language} />
                        </div>
                      ))}
                    </div>
                  </LessonSection>
                )}

                {/* 16. Legacy Complexity (if present) */}
                {hasLegacyComplexities && (
                  <LessonSection
                    id="legacyComplexity"
                    icon={BarChart2}
                    title="Legacy Complexity"
                  >
                    <div className="adp-table-wrap">
                      <table className="adp-table">
                        <thead>
                          <tr>
                            <th>Approach</th>
                            <th>Time</th>
                            <th>Space</th>
                            <th>Why</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complexityRows.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: '600' }}>{renderAiText(row.approach, `legacy-comp-app-${idx}`, true)}</td>
                              <td><code className="adp-inline-code" style={{ color: '#168B62' }}>{renderAiText(row.timeComplexity, `legacy-comp-tc-${idx}`, true)}</code></td>
                              <td><code className="adp-inline-code" style={{ color: '#15803D' }}>{renderAiText(row.spaceComplexity, `legacy-comp-sc-${idx}`, true)}</code></td>
                              <td style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                <strong>Time:</strong> {renderAiText(row.timeReason, `legacy-comp-tr-${idx}`, true)}<br />
                                <strong>Space:</strong> {renderAiText(row.spaceReason, `legacy-comp-sr-${idx}`, true)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </LessonSection>
                )}

                {/* 17. Legacy Dry Run (if present) */}
                {hasLegacyDryRun && (
                  <LessonSection
                    id="legacyDryRun"
                    icon={Activity}
                    title="Legacy Dry Run"
                  >
                    {renderDryRun(result.dryRun)}
                  </LessonSection>
                )}

                {/* Ask AlgoMentor Follow-up Section */}
                <section id="mentor-qa" className="adp-lesson-section" style={{ paddingBottom: '24px' }}>
                  <div className="adp-section-head">
                    <SectionIcon icon={Sparkles} color="#168B62" bg="#EAF7F1" />
                    <h2 className="adp-section-title">Ask AlgoMentor</h2>
                  </div>
                  <div className="adp-section-body">
                    <div className="adp-mentor-log" style={{ borderColor: '#CDE8D8', backgroundColor: '#F9FDFB' }}>
                      {followUps.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                          No follow-up questions yet. Use the presets or write below to ask.
                        </p>
                      ) : (
                        followUps.map((item, idx) => (
                          <div key={item._id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: idx < followUps.length - 1 ? '1px dashed var(--border)' : 'none', paddingBottom: idx < followUps.length - 1 ? '20px' : '0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                              <span style={{ fontWeight: '700', color: '#4A5D4E' }}>STUDENT QUESTION:</span>
                              <span style={{ color: '#708274' }}>
                                {getModeLabel(item.mode)} · {new Date(item.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p style={{ fontSize: '13.5px', fontStyle: 'italic', color: 'var(--text-primary)', margin: '0 0 6px 0', paddingLeft: '8px', borderLeft: '2px solid #168B62' }}>
                              "{renderAiText(item.question, `qa-q-${idx}`, true)}"
                            </p>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', alignItems: 'flex-start' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#168B62', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0 }}>
                                AI
                              </div>
                              <div>
                                <span style={{ fontWeight: '700', fontSize: '12px', display: 'block', color: '#168B62', textTransform: 'uppercase', marginBottom: '4px' }}>Mentor Insights</span>
                                {renderAiText(item.answer, `qa-a-${idx}`)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chip suggestions */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                      <button
                        onClick={() => handleChipClick('Why is this approach optimal?', 'explain')}
                        className="adp-chip-btn"
                        type="button"
                        style={{
                          backgroundColor: selectedFollowUpQuestion === 'Why is this approach optimal?' ? 'var(--primary-soft)' : '',
                          borderColor: selectedFollowUpQuestion === 'Why is this approach optimal?' ? 'var(--primary)' : '',
                          color: selectedFollowUpQuestion === 'Why is this approach optimal?' ? 'var(--primary)' : ''
                        }}
                      >
                        Why is this approach optimal?
                      </button>
                      <button
                        onClick={() => handleChipClick('Which edge case am I missing?', 'edgeCase')}
                        className="adp-chip-btn"
                        type="button"
                        style={{
                          backgroundColor: selectedFollowUpQuestion === 'Which edge case am I missing?' ? 'var(--primary-soft)' : '',
                          borderColor: selectedFollowUpQuestion === 'Which edge case am I missing?' ? 'var(--primary)' : '',
                          color: selectedFollowUpQuestion === 'Which edge case am I missing?' ? 'var(--primary)' : ''
                        }}
                      >
                        Which edge case am I missing?
                      </button>
                      {revealedLevel < totalHints && (
                        <button
                          onClick={() => handleChipClick('Give me one more hint', 'hint')}
                          className="adp-chip-btn"
                          type="button"
                          style={{
                            backgroundColor: selectedFollowUpQuestion === 'Give me one more hint' ? 'var(--primary-soft)' : '',
                            borderColor: selectedFollowUpQuestion === 'Give me one more hint' ? 'var(--primary)' : '',
                            color: selectedFollowUpQuestion === 'Give me one more hint' ? 'var(--primary)' : ''
                          }}
                        >
                          Give me one more hint
                        </button>
                      )}
                      <button
                        onClick={() => handleChipClick('How can I explain this in an interview?', 'interview')}
                        className="adp-chip-btn"
                        type="button"
                        style={{
                          backgroundColor: selectedFollowUpQuestion === 'How can I explain this in an interview?' ? 'var(--primary-soft)' : '',
                          borderColor: selectedFollowUpQuestion === 'How can I explain this in an interview?' ? 'var(--primary)' : '',
                          color: selectedFollowUpQuestion === 'How can I explain this in an interview?' ? 'var(--primary)' : ''
                        }}
                      >
                        How can I explain this in an interview?
                      </button>
                      <button
                        onClick={() => handleChipClick('How can I improve my code?', 'improve')}
                        className="adp-chip-btn"
                        type="button"
                        style={{
                          backgroundColor: selectedFollowUpQuestion === 'How can I improve my code?' ? 'var(--primary-soft)' : '',
                          borderColor: selectedFollowUpQuestion === 'How can I improve my code?' ? 'var(--primary)' : '',
                          color: selectedFollowUpQuestion === 'How can I improve my code?' ? 'var(--primary)' : ''
                        }}
                      >
                        How can I improve my code?
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAskMentor} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                      <FormError message={followUpError} />
                      {validationError && (
                        <div className="validation-error" style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: '500', padding: '8px 12px', backgroundColor: 'var(--danger-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(22, 139, 98, 0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0 }} />
                          <span>{validationError}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['explain', 'hint', 'improve', 'edgeCase', 'interview'].map((m) => (
                          <label
                            key={m}
                            className="adp-mode-chip"
                            onClick={() => handlePresetModeSelect(m)}
                            style={{
                              backgroundColor: followUpMode === m ? '#EAF7F1' : '#FAFDFB',
                              borderColor: followUpMode === m ? '#168B62' : '#E2EFE7',
                              color: followUpMode === m ? '#168B62' : 'inherit',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="radio"
                              name="followUpMode"
                              checked={followUpMode === m}
                              onChange={() => handlePresetModeSelect(m)}
                              disabled={isSubmittingFollowUp}
                              style={{ display: 'none' }}
                            />
                            {getModeLabel(m)}
                          </label>
                        ))}
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <textarea
                          value={newQuestion}
                          onChange={(e) => {
                            setNewQuestion(e.target.value);
                            setSelectedFollowUpQuestion('');
                            setValidationError('');
                          }}
                          placeholder="Ask the AI mentor to elaborate on a concept, provide code suggestions, or test inputs..."
                          maxLength={2000}
                          rows={3}
                          disabled={isSubmittingFollowUp}
                          style={{ padding: '12px', minHeight: '80px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid #E2EFE7', width: '100%', outline: 'none', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{newQuestion.length}/2000 characters</span>
                        <button
                          type="submit"
                          disabled={isSubmittingFollowUp}
                          className="btn btn-primary btn-sm icon-btn"
                          style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#168B62', borderColor: '#168B62', color: '#ffffff' }}
                        >
                          {isSubmittingFollowUp ? (
                            <>
                              <div className="spinner" style={{ width: '12px', height: '12px', margin: 0, borderTopColor: '#ffffff' }}></div>
                              <span>Thinking...</span>
                            </>
                          ) : (
                            <>
                              <Send size={12} />
                              <span>Ask AlgoMentor</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              </main>

              {/* ──── Right learning summary rail (30%) ──── */}
              <aside className="adp-rail">
                <div className="adp-rail-inner">
                  <h3 className="adp-rail-title">Your Learning Summary</h3>

                  {/* Learning Mode */}
                  {modeLabel && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Brain size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Learning Mode</span>
                        <strong className="adp-rail-value">{modeLabel}</strong>
                        {modeDesc && <span className="adp-rail-sub">{renderAiText(modeDesc, 'rail-modedesc', true)}</span>}
                      </div>
                    </div>
                  )}

                  {/* Detected Pattern */}
                  {patternName && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <GitBranch size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Detected Pattern</span>
                        <strong className="adp-rail-value" style={{ color: 'var(--primary)' }}>{patternName}</strong>
                        {patternReason && <span className="adp-rail-sub">{renderAiText(patternReason, 'rail-patreason', true)}</span>}
                      </div>
                    </div>
                  )}

                  {/* Analysis Depth */}
                  {depthLabel && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Layers size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Analysis Depth</span>
                        <strong className="adp-rail-value">{depthLabel}</strong>
                        {depthDesc && <span className="adp-rail-sub">{renderAiText(depthDesc, 'rail-depthdesc', true)}</span>}
                      </div>
                    </div>
                  )}

                  {/* Confidence — only when real data exists */}
                  {confidenceKey && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Star size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Confidence</span>
                        <strong className="adp-rail-value" style={{ color: confidenceColors[confidenceKey] }}>
                          {confidenceLabels[confidenceKey]}
                        </strong>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
                          {['very-low', 'low', 'medium', 'high', 'very-high'].map((lvl, i) => {
                            const filled = ['very-low', 'low', 'medium', 'high', 'very-high'].indexOf(confidenceKey) >= i;
                            return (
                              <span key={lvl} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: filled ? confidenceColors[confidenceKey] : 'var(--border)', display: 'inline-block' }} />
                            );
                          })}
                        </div>
                        {result.confidenceReason && (
                          <span className="adp-rail-sub">{renderAiText(result.confidenceReason, 'rail-confreason', true)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Revision Status */}
                  {revisionStatus && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Clock size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Revision Status</span>
                        <strong className="adp-rail-value" style={{ color: revisionStatus === 'new' ? 'var(--warning)' : 'var(--primary)', textTransform: 'capitalize' }}>{revisionStatus}</strong>
                        <span className="adp-rail-sub">
                          {revisionStatus === 'new' ? 'Keep practising to reinforce this pattern' : 'Review this problem again soon'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Saved Status */}
                  {savedStatus !== null && savedStatus !== undefined && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Bookmark size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Saved Status</span>
                        <strong className="adp-rail-value" style={{ color: savedStatus ? 'var(--primary)' : 'var(--text-secondary)' }}>
                          {savedStatus ? 'Saved to your library' : 'Not saved'}
                        </strong>
                        {savedStatus && <span className="adp-rail-sub">You can review it anytime</span>}
                      </div>
                    </div>
                  )}

                  {/* Next Recommended Action */}
                  {nextAction && (
                    <div className="adp-rail-item">
                      <div className="adp-rail-icon-wrap">
                        <Zap size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <span className="adp-rail-label">Next Recommended Action</span>
                        <strong className="adp-rail-value">{nextAction}</strong>
                      </div>
                    </div>
                  )}

                  {/* Requested Sections */}
                  {analysis.requestedSections && analysis.requestedSections.length > 0 && (
                    <div className="adp-rail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="adp-rail-icon-wrap">
                          <Hash size={14} style={{ color: 'var(--primary)' }} />
                        </div>
                        <span className="adp-rail-label" style={{ margin: 0 }}>Requested Sections</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingLeft: '32px' }}>
                        {analysis.requestedSections.map((sec, idx) => (
                          <span key={idx} className="adp-section-tag">{sec}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisDetailPage;
export { AnalysisDetailPage };
