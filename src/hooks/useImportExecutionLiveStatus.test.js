import { renderHook, act } from '@testing-library/react';
import apiService from '../services/api';
import { ExecutionStatus } from '../models';
import { POLL_INTERVAL_MS, WORKFLOW_MAX_WAIT_MS } from '../utils/constants';
import {
  enqueueImportJobIds,
  useImportExecutionLiveStatus,
} from './useImportExecutionLiveStatus';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getAccessToken: jest.fn(() => Promise.resolve('token')),
    connectImportJobEvents: jest.fn(),
    connectExecutionEvents: jest.fn(),
    connectEventsByApiPath: jest.fn(),
    getImportJobStatus: jest.fn(() => Promise.resolve({ status: 'pending', progress: 0 })),
    getImportExecutionStatus: jest.fn(() =>
      Promise.resolve({ status: 'pending', progress: 0, execution_id: '1' })
    ),
    getByApiPath: jest.fn(() => Promise.resolve({ status: 'pending', progress: 0 })),
  },
}));

describe('enqueueImportJobIds', () => {
  it('appends new ids in order and dedupes against queue and active id', () => {
    const queue = ['2'];
    const appended = enqueueImportJobIds(queue, '1', [
      { runId: '1' },
      { runId: '2' },
      { runId: '3' },
      '4',
    ]);
    expect(appended).toEqual(['3', '4']);
    expect(queue).toEqual(['2', '3', '4']);
  });

  it('ignores empty or invalid ids', () => {
    const queue = [];
    const appended = enqueueImportJobIds(queue, null, [
      { runId: '' },
      { runId: '  ' },
      null,
      { runId: '7' },
    ]);
    expect(appended).toEqual(['7']);
    expect(queue).toEqual(['7']);
  });
});

describe('useImportExecutionLiveStatus queue', () => {
  const jobSseById = new Map();
  const execSseById = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    jobSseById.clear();
    execSseById.clear();
    apiService.connectImportJobEvents.mockImplementation((id, onMessage) => {
      const key = String(id);
      const handle = { onMessage, close: jest.fn() };
      jobSseById.set(key, handle);
      return { close: handle.close };
    });
    apiService.connectExecutionEvents.mockImplementation((id, onMessage) => {
      const key = String(id);
      const handle = { onMessage, close: jest.fn() };
      execSseById.set(key, handle);
      return { close: handle.close };
    });
    apiService.connectEventsByApiPath.mockImplementation((_url, onMessage) => ({
      onMessage,
      close: jest.fn(),
    }));
    apiService.getImportJobStatus.mockResolvedValue({
      status: ExecutionStatus.PENDING,
      progress: 0,
    });
    apiService.getByApiPath.mockResolvedValue({
      status: ExecutionStatus.PENDING,
      progress: 0,
    });
  });

  function renderLiveStatus(overrides = {}) {
    const onCompleted = jest.fn();
    const onFailed = jest.fn();
    const onPollError = jest.fn();
    const onConnectionMode = jest.fn();
    const onExecutionId = jest.fn();

    const hook = renderHook(() =>
      useImportExecutionLiveStatus({
        onStatus: jest.fn(),
        onProgress: jest.fn(),
        onCompleted,
        onFailed,
        onPollError,
        onConnectionMode,
        onExecutionId,
        ...overrides,
      })
    );

    return { ...hook, onCompleted, onFailed, onPollError, onConnectionMode, onExecutionId };
  }

  async function flushAsync() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('starts only the first pending import job when three are enqueued', async () => {
    const { result } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([
        { runId: '10' },
        { runId: '11' },
        { runId: '12' },
      ]);
    });

    await flushAsync();

    expect(apiService.connectImportJobEvents).toHaveBeenCalledTimes(1);
    expect(apiService.connectImportJobEvents.mock.calls[0][0]).toBe('10');
    expect(jobSseById.has('11')).toBe(false);
    expect(jobSseById.has('12')).toBe(false);
  });

  it('advances to the next job after completed', async () => {
    const { result, onCompleted } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: '10' }, { runId: '11' }]);
    });

    await flushAsync();

    act(() => {
      jobSseById.get('10').onMessage({
        status: ExecutionStatus.COMPLETED,
        progress: 100,
        execution_id: 55,
      });
    });

    await flushAsync();

    expect(onCompleted).toHaveBeenCalledWith(
      '10',
      expect.objectContaining({ status: 'completed' })
    );
    expect(apiService.connectImportJobEvents).toHaveBeenCalledTimes(2);
    expect(apiService.connectImportJobEvents.mock.calls[1][0]).toBe('11');
  });

  it('advances to the next job after failed without execution_id', async () => {
    const { result, onFailed } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: '20' }, { runId: '21' }]);
    });

    await flushAsync();

    act(() => {
      jobSseById.get('20').onMessage({
        status: ExecutionStatus.FAILED,
        error_message: 'parse error',
      });
    });

    await flushAsync();

    expect(onFailed).toHaveBeenCalledWith(
      '20',
      'parse error',
      expect.objectContaining({ status: 'failed' })
    );
    expect(apiService.connectImportJobEvents).toHaveBeenCalledTimes(2);
    expect(jobSseById.has('21')).toBe(true);
  });

  it('switches to execution events once execution_id appears', async () => {
    const { result, onExecutionId } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: '30' }]);
    });

    await flushAsync();

    act(() => {
      jobSseById.get('30').onMessage({
        status: ExecutionStatus.RUNNING,
        current_stage: 'verification',
        progress: 20,
        execution_id: 99,
      });
    });

    await flushAsync();

    expect(onExecutionId).toHaveBeenCalledWith('30', '99');
    expect(apiService.connectExecutionEvents).toHaveBeenCalled();
    expect(apiService.connectExecutionEvents.mock.calls[0][0]).toBe('99');
  });

  it('does not promote when execution_id is a live-store key import-{n}', async () => {
    const { result, onExecutionId } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: '64' }]);
    });

    await flushAsync();

    act(() => {
      jobSseById.get('64').onMessage({
        status: ExecutionStatus.RUNNING,
        progress: 10,
        execution_id: 'import-64',
      });
    });

    await flushAsync();

    expect(onExecutionId).not.toHaveBeenCalled();
    expect(apiService.connectExecutionEvents).not.toHaveBeenCalled();
    expect(apiService.getImportExecutionStatus).not.toHaveBeenCalled();
  });

  it('prefers status_url / events_url from the 202 accept payload', async () => {
    jest.useFakeTimers('modern');
    try {
      const { result } = renderLiveStatus();

      act(() => {
        result.current.startImportJobQueue([
          {
            runId: '64',
            statusUrl: '/api/executions/import/jobs/64/status',
            eventsUrl: '/api/executions/import/jobs/64/events',
          },
        ]);
      });

      await flushAsync();

      expect(apiService.connectEventsByApiPath.mock.calls[0][0]).toBe(
        '/api/executions/import/jobs/64/events'
      );
      expect(apiService.connectImportJobEvents).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS + 50);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(apiService.getByApiPath).toHaveBeenCalledWith(
        '/api/executions/import/jobs/64/status'
      );
      expect(apiService.getImportJobStatus).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('strips import- prefix if a store key is enqueued as runId', async () => {
    const { result } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: 'import-64' }]);
    });

    await flushAsync();

    expect(apiService.connectImportJobEvents).toHaveBeenCalled();
    expect(apiService.connectImportJobEvents.mock.calls[0][0]).toBe('64');
  });

  it('stopAllLiveStatus clears the queue and prevents further subscriptions', async () => {
    const { result } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: '30' }, { runId: '31' }]);
    });

    await flushAsync();

    act(() => {
      result.current.stopAllLiveStatus();
    });

    act(() => {
      result.current.startImportJobQueue([{ runId: '32' }]);
    });

    await flushAsync();

    expect(apiService.connectImportJobEvents).toHaveBeenCalledTimes(2);
    expect(apiService.connectImportJobEvents.mock.calls[0][0]).toBe('30');
    expect(apiService.connectImportJobEvents.mock.calls[1][0]).toBe('32');
    expect(jobSseById.has('31')).toBe(false);
  });

  it('appends a second batch to the tail while the first is active', async () => {
    const { result } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: '40' }]);
    });

    await flushAsync();

    act(() => {
      result.current.startImportJobQueue([{ runId: '41' }, { runId: '42' }]);
    });

    act(() => {
      jobSseById.get('40').onMessage({ status: ExecutionStatus.COMPLETED, progress: 100 });
    });

    await flushAsync();

    expect(apiService.connectImportJobEvents).toHaveBeenCalledTimes(2);
    expect(apiService.connectImportJobEvents.mock.calls[1][0]).toBe('41');

    act(() => {
      jobSseById.get('41').onMessage({ status: ExecutionStatus.COMPLETED, progress: 100 });
    });

    await flushAsync();

    expect(apiService.connectImportJobEvents).toHaveBeenCalledTimes(3);
    expect(jobSseById.has('42')).toBe(true);
  });
});

describe('useImportExecutionLiveStatus stall timeout', () => {
  const jobSseById = new Map();
  let latestStatus;
  let hookResult;

  beforeEach(() => {
    jest.clearAllMocks();
    jobSseById.clear();
    hookResult = null;
    latestStatus = { status: ExecutionStatus.PENDING, progress: 0 };
    apiService.connectImportJobEvents.mockImplementation((id, onMessage) => {
      const key = String(id);
      const handle = { onMessage, close: jest.fn() };
      jobSseById.set(key, handle);
      return { close: handle.close };
    });
    apiService.connectExecutionEvents.mockImplementation(() => ({ close: jest.fn() }));
    apiService.getImportJobStatus.mockImplementation(() => Promise.resolve(latestStatus));
    jest.useFakeTimers('modern');
  });

  afterEach(() => {
    hookResult?.current?.stopAllLiveStatus();
    hookResult = null;
    jest.useRealTimers();
  });

  function renderLiveStatus() {
    const onCompleted = jest.fn();
    const onFailed = jest.fn();
    const onPollError = jest.fn();

    const hook = renderHook(() =>
      useImportExecutionLiveStatus({
        onStatus: jest.fn(),
        onProgress: jest.fn(),
        onCompleted,
        onFailed,
        onPollError,
        onConnectionMode: jest.fn(),
      })
    );
    hookResult = hook.result;

    return { ...hook, onCompleted, onFailed, onPollError };
  }

  async function flushAsync() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function sendProgress(runId, completed) {
    latestStatus = {
      status: ExecutionStatus.RUNNING,
      progress: completed,
      current_stage: 'verification',
      verification_progress: {
        total: 100,
        completed,
        current_index: completed,
        current_verifying: `Paper ${completed}`,
      },
    };
    jobSseById.get(String(runId)).onMessage(latestStatus);
  }

  it('times out when status snapshots stay unchanged', async () => {
    const { result, onPollError } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: '99' }]);
    });
    await flushAsync();

    await act(async () => {
      jest.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onPollError).not.toHaveBeenCalled();

    await act(async () => {
      jest.setSystemTime(Date.now() + WORKFLOW_MAX_WAIT_MS + 1);
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onPollError).toHaveBeenCalledWith(
      '99',
      expect.objectContaining({
        message: expect.stringMatching(/stalled \(no progress for 10 minutes\)/i),
      })
    );
  });

  it('does not time out while verification progress keeps changing', async () => {
    const { result, onPollError, onCompleted } = renderLiveStatus();

    act(() => {
      result.current.startImportJobQueue([{ runId: '10' }]);
    });
    await flushAsync();

    await act(async () => {
      jest.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      for (let i = 1; i <= 3; i++) {
        sendProgress('10', i);
        jest.setSystemTime(Date.now() + WORKFLOW_MAX_WAIT_MS - POLL_INTERVAL_MS);
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
        await Promise.resolve();
        await Promise.resolve();
      }
    });

    expect(onPollError).not.toHaveBeenCalled();
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
