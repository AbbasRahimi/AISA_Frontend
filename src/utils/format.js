/**
 * Shared formatting and display helpers.
 */

/**
 * Formats a timestamp as relative time (e.g. "5m ago").
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const time = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  const diffSecs = Math.floor((now - time) / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ago`;
}

/**
 * Returns Bootstrap badge/color class for execution status.
 * @param {string} status - ExecutionStatus value
 * @returns {string} Bootstrap color name (e.g. 'success', 'danger')
 */
export function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'secondary';
    case 'running': return 'primary';
    case 'completed': return 'success';
    case 'failed': return 'danger';
    default: return 'secondary';
  }
}
