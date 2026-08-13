import { renderHook, act } from '@testing-library/react';
import apiService from '../services/api';
import { ExecutionStatus } from '../models';
import {
  enqueueVerificationIds,
  useImportExecutionLiveStatus,
} from './useImportExecutionLiveStatus';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getAccessToken: jest.fn(() => Promise.resolve('token')),
    connectExecutionEvents: jest.fn(),
    getImportExecutionStatus: jest.fn(() => Promise.resolve({ status: 'pending', progress: 0 })),
  },
}));

describe('enqueueVerificationIds', () => {
  it('appends new ids in order and dedupes against queue and active id', () => {
    const queue = ['2'];
    const appended = enqueueVerificationIds(queue, '1', [
      { executionId: '1' },
      { executionId: '2' },
      { executionId: '3' },
      '4',
    ]);
    expect(appended).toEqual(['3', '4']);
    expect(queue).toEqual(['2', '3', '4']);
  });

  it('ignores empty or invalid ids', () => {
    const queue = [];
    const appended = enqueueVerificationIds(queue, null, [
      { executionId: '' },
      { executionId: '  ' },
      null,
      { executionId: '7' },
    ]);
    expect(appended).toEqual(['7']);
    expect(queue).toEqual(['7']);
  });
});

describe('useImportExecutionLiveStatus queue', () => {
  const sseById = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    sseById.clear();
    apiService.connectExecutionEvents.mockImplementation((id, onMessage) => {
      const key = String(id);
      const handle = { onMessage, close: jest.fn() };
      sseById.set(key, handle);
      return { close: handle.close };
    });
    apiService.getImportExecutionStatus.mockResolvedValue({
      status: ExecutionStatus.PENDING,
      progress: 0,
    });
  });

  function renderLiveStatus(overrides = {}) {
    const onCompleted = jest.fn();
    const onFailed = jest.fn();
    const onPollError = jest.fn();
    const onConnectionMode = jest.fn();

    const hook = renderHook(() =>
      useImportExecutionLiveStatus({
        onStatus: jest.fn(),
        onProgress: jest.fn(),
        onCompleted,
        onFailed,
        onPollError,
        onConnectionMode,
        ...overrides,
      })
    );

    return { ...hook, onCompleted, onFailed, onPollError, onConnectionMode };
  }

  async function flushAsync() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('starts only the first pending execution when three are enqueued', async () => {
    const { result } = renderLiveStatus();

    act(() => {
      result.current.startVerificationQueue([
        { executionId: '10' },
        { executionId: '11' },
        { executionId: '12' },
      ]);
    });

    await flushAsync();

    expect(apiService.connectExecutionEvents).toHaveBeenCalledTimes(1);
    expect(apiService.connectExecutionEvents.mock.calls[0][0]).toBe('10');
    expect(sseById.has('11')).toBe(false);
    expect(sseById.has('12')).toBe(false);
  });

  it('advances to the next execution after completed', async () => {
    const { result, onCompleted } = renderLiveStatus();

    act(() => {
      result.current.startVerificationQueue([{ executionId: '10' }, { executionId: '11' }]);
    });

    await flushAsync();

    act(() => {
      sseById.get('10').onMessage({ status: ExecutionStatus.COMPLETED, progress: 100 });
    });

    await flushAsync();

    expect(onCompleted).toHaveBeenCalledWith('10', expect.objectContaining({ status: 'completed' }));
    expect(apiService.connectExecutionEvents).toHaveBeenCalledTimes(2);
    expect(apiService.connectExecutionEvents.mock.calls[1][0]).toBe('11');
  });

  it('advances to the next execution after failed', async () => {
    const { result, onFailed } = renderLiveStatus();

    act(() => {
      result.current.startVerificationQueue([{ executionId: '20' }, { executionId: '21' }]);
    });

    await flushAsync();

    act(() => {
      sseById.get('20').onMessage({ status: ExecutionStatus.FAILED, error: 'boom' });
    });

    await flushAsync();

    expect(onFailed).toHaveBeenCalledWith('20', 'boom');
    expect(apiService.connectExecutionEvents).toHaveBeenCalledTimes(2);
    expect(sseById.has('21')).toBe(true);
  });

  it('stopAllLiveStatus clears the queue and prevents further subscriptions', async () => {
    const { result } = renderLiveStatus();

    act(() => {
      result.current.startVerificationQueue([{ executionId: '30' }, { executionId: '31' }]);
    });

    await flushAsync();

    act(() => {
      result.current.stopAllLiveStatus();
    });

    act(() => {
      result.current.startVerificationQueue([{ executionId: '32' }]);
    });

    await flushAsync();

    expect(apiService.connectExecutionEvents).toHaveBeenCalledTimes(2);
    expect(apiService.connectExecutionEvents.mock.calls[0][0]).toBe('30');
    expect(apiService.connectExecutionEvents.mock.calls[1][0]).toBe('32');
    expect(sseById.has('31')).toBe(false);
  });

  it('appends a second batch to the tail while the first is active', async () => {
    const { result } = renderLiveStatus();

    act(() => {
      result.current.startVerificationQueue([{ executionId: '40' }]);
    });

    await flushAsync();

    act(() => {
      result.current.startVerificationQueue([{ executionId: '41' }, { executionId: '42' }]);
    });

    act(() => {
      sseById.get('40').onMessage({ status: ExecutionStatus.COMPLETED, progress: 100 });
    });

    await flushAsync();

    expect(apiService.connectExecutionEvents).toHaveBeenCalledTimes(2);
    expect(apiService.connectExecutionEvents.mock.calls[1][0]).toBe('41');

    act(() => {
      sseById.get('41').onMessage({ status: ExecutionStatus.COMPLETED, progress: 100 });
    });

    await flushAsync();

    expect(apiService.connectExecutionEvents).toHaveBeenCalledTimes(3);
    expect(sseById.has('42')).toBe(true);
  });
});
