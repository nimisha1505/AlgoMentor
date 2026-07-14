import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Common component to render validation or API errors safely.
 */
const FormError = ({ message }) => {
  if (!message) return null;

  return (
    <div className="form-error" role="alert">
      <AlertCircle size={16} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
};

export default FormError;
export { FormError };
