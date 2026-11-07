import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, toApiError } from '../../src/api/client';

function stubFetch(payload: unknown, status = 200, failJson = false): ReturnType<typeof vi.fn> {
  const respond = async (): Promise<{ status: number; json: () => Promise<unknown> }> => ({
    status,
    json: async () => {
      if (failJson) throw new Error('not json');
      return payload;
    },
  });
  return vi.fn(async () => respond());
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request', () => {
  it('unwraps the { data } envelope', async () => {
    vi.stubGlobal('fetch', stubFetch({ data: { status: 'ok' } }));
    await expect(request<{ status: string }>('/api/health')).resolves.toEqual({ status: 'ok' });
  });

  it('sends JSON body and method for mutations', async () => {
    const fetchMock = stubFetch({ data: null });
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/tasks', { method: 'POST', body: { title: 'x' } });
    const init = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ title: 'x' }));
    expect((init?.headers as Record<string, string>)?.['Content-Type']).toBe('application/json');
  });

  it('returns undefined for 204 without body', async () => {
    const fetchMock = stubFetch(null, 204);
    vi.stubGlobal('fetch', fetchMock);
    await expect(request<void>('/api/tasks/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('throws ApiError with code/message/details for server error envelopes', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(
        { error: { code: 'TASK_NOT_FOUND', message: '任务不存在', details: null } },
        404,
      ),
    );
    const error = await request('/api/tasks/1').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('TASK_NOT_FOUND');
    expect((error as ApiError).message).toBe('任务不存在');
    expect((error as ApiError).details).toBeNull();
  });

  it('collects field details from VALIDATION_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '校验失败',
            details: [
              { path: 'title', message: '长度不足' },
              { key: 'broken', message: '应被忽略' },
            ],
          },
        },
        400,
      ),
    );
    const error = await request('/api/tasks').catch((err: unknown) => err);
    expect((error as ApiError).code).toBe('VALIDATION_ERROR');
    expect((error as ApiError).details).toEqual([{ path: 'title', message: '长度不足' }]);
  });

  it('maps unknown response payloads to INTERNAL_ERROR', async () => {
    vi.stubGlobal('fetch', stubFetch({ hello: 1 }));
    await expect(request('/api/tasks')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('maps a failed fetch to NETWORK_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    await expect(request('/api/tasks')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      name: 'ApiError',
    });
  });

  it('maps non-JSON responses to INTERNAL_ERROR', async () => {
    vi.stubGlobal('fetch', stubFetch(null, 500, true));
    await expect(request('/api/tasks')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});

describe('ApiError / toApiError', () => {
  it('is an Error with metadata', () => {
    const error = new ApiError('VALIDATION_ERROR', '校验失败', [{ path: 'title', message: '必填' }]);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual([{ path: 'title', message: '必填' }]);
  });

  it('passes ApiError through unchanged and wraps others', () => {
    const apiError = new ApiError('TASK_NOT_FOUND', '任务不存在');
    expect(toApiError(apiError)).toBe(apiError);
    expect(toApiError(new Error('boom')).code).toBe('INTERNAL_ERROR');
  });
});
