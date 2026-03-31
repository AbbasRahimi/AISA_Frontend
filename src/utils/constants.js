/**
 * Application-wide constants to avoid magic numbers and strings.
 */

// Execution polling (MainDashboard)
export const POLL_INITIAL_DELAY_MS = 800;
export const POLL_INTERVAL_MS = 2000;
// Max time the UI should wait for a workflow to progress to completion.
export const WORKFLOW_MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes

// Allow the backend enough time to create the execution record and start returning status.
// This is important when LLM inference + backend processing can take several minutes.
export const POLL_404_GRACE_PERIOD_MS = WORKFLOW_MAX_WAIT_MS;

// UI
export const TEXT_PREVIEW_WORD_COUNT = 20;
