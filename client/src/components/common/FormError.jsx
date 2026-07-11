import React from 'react';

/**
 * Common component to render validation or API errors safely.
 */
const FormError = ({ message }) => {
  if (!message) return null;

  return (
    <div className="form-error" role="alert">
      {message}
    </div>
  );
};

export default FormError;
export { FormError };
