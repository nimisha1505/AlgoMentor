import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Reusable preformatted CodeBlock component featuring copy capability and temporary visual success feedback.
 */
const CodeBlock = ({ code, language = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-block-lang">{language ? language.toUpperCase() : 'CODE'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="code-block-copy-btn"
          aria-label="Copy code block"
        >
          {copied ? (
            <span className="copied-text-wrapper">
              <Check size={14} className="copied-icon" />
              <span>Copied!</span>
            </span>
          ) : (
            <span className="copied-text-wrapper">
              <Copy size={14} />
              <span>Copy</span>
            </span>
          )}
        </button>
      </div>
      <pre className="code-pre">
        <code className="code-inner">{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
export { CodeBlock };
