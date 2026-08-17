/**
 * Application-wide constants to avoid magic numbers and strings.
 */

// Execution polling (MainDashboard)
export const POLL_INITIAL_DELAY_MS = 800;
/** Status poll interval (REST fallback / parallel with WebSocket). */
export const POLL_INTERVAL_MS = 1000;
/** REST /status fallback timeout (push channels handle long runs). */
export const STATUS_POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
/** Wait before falling back from WebSocket to SSE/poll. */
export const WORKFLOW_WS_CONNECT_TIMEOUT_MS = 5000;
/** Max time with no status/progress change before the UI gives up on a live workflow. */
export const WORKFLOW_MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes

// Allow the backend enough time to create the execution record and start returning status.
// This is important when LLM inference + backend processing can take several minutes.
export const POLL_404_GRACE_PERIOD_MS = WORKFLOW_MAX_WAIT_MS;

/** Multipart upload + job create for subtract-matches (may be large). */
export const SUBTRACT_MATCHES_JOB_CREATE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
/** Max time the UI should keep polling a subtract-matches job. */
export const SUBTRACT_MATCHES_JOB_MAX_WAIT_MS = 30 * 60 * 1000; // 30 minutes
/** Fetching persisted subtract-matches job results. */
export const SUBTRACT_MATCHES_JOB_RESULTS_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// UI
export const TEXT_PREVIEW_WORD_COUNT = 20;
