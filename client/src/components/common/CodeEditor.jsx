import React from 'react';
import Editor from '@monaco-editor/react';

/**
 * Monaco Editor integration wrapper for code logic submissions.
 */
const CodeEditor = ({
  value,
  onChange,
  language,
  disabled,
  height = '360px',
  isCodeReviewSelected = false,
}) => {
  const mapLanguage = (lang) => {
    switch (lang) {
      case 'cpp':
        return 'cpp';
      case 'java':
        return 'java';
      case 'python':
        return 'python';
      case 'javascript':
        return 'javascript';
      case 'c':
        return 'c';
      default:
        return 'plaintext';
    }
  };

  const getLanguageLabel = (lang) => {
    const labels = {
      cpp: 'C++',
      java: 'Java',
      python: 'Python',
      javascript: 'JavaScript',
      c: 'C',
      other: 'Plaintext',
    };
    return labels[lang] || lang.toUpperCase();
  };

  return (
    <div className="monaco-editor-wrapper">
      <div className="editor-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Code</span>
          <span className="editor-lang-badge" style={{ backgroundColor: 'var(--bg-surface-soft)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {getLanguageLabel(language)}
          </span>
        </div>
        {!isCodeReviewSelected && (
          <span className="editor-warning-indicator" style={{ fontSize: '11px', color: 'var(--warning)', fontStyle: 'italic' }}>
            Code review module is not selected
          </span>
        )}
      </div>

      <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        <label htmlFor="monaco-editor-accessible-input" className="sr-only" style={{ display: 'none' }}>
          Monaco code editor input field
        </label>
        <Editor
          id="monaco-editor-accessible-input"
          height={height}
          language={mapLanguage(language)}
          value={value}
          theme="vs-dark"
          loading={<div className="editor-loading-placeholder" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>Loading Editor...</div>}
          onChange={(val) => onChange(val ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 22,
            fontLigatures: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            padding: {
              top: 16,
              bottom: 16
            },
            readOnly: disabled,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: 'line',
            smoothScrolling: true
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
export { CodeEditor };
