import React from 'react';

/**
 * Reusable Status Badge to output standardized, styled status flags.
 */
const StatusBadge = ({ status }) => {
  const normalized = (status || '').toLowerCase();
  let label = status || 'Unknown';
  let cssClass = 'badge-draft';

  switch (normalized) {
    case 'draft':
      label = 'Draft';
      cssClass = 'badge-draft';
      break;
    case 'queued':
      label = 'Queued';
      cssClass = 'badge-queued';
      break;
    case 'processing':
      label = 'Processing';
      cssClass = 'badge-processing';
      break;
    case 'completed':
      label = 'Completed';
      cssClass = 'badge-completed';
      break;
    case 'failed':
      label = 'Failed';
      cssClass = 'badge-failed';
      break;
    default:
      cssClass = 'badge-unknown';
  }

  return <span className={`status-badge ${cssClass}`}>{label}</span>;
};

export default StatusBadge;
export { StatusBadge };
