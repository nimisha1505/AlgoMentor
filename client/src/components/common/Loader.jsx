import React from 'react';

/**
 * Accessible loader spinner component.
 */
const Loader = ({ text = 'Loading...' }) => {
  return (
    <div className="loader-container" role="status" aria-live="polite">
      <div className="spinner"></div>
      <span className="loader-text">{text}</span>
    </div>
  );
};

export default Loader;
export { Loader };
