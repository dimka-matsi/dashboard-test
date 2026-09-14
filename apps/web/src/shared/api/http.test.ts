import { afterEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';

import { jsonResponse } from '@/test/fixtures';

import { ApiError, fetchJson } from './http';

const Schema = z.object({ value: z.number() });

afterEach(() => {
  vi.unstubAllGlobals();
});

async function expectApiError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('ожидалась ошибка');
}

describe('fetchJson', () => {
  it('возвращает данные, прошедшие схему', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ value: 42, extra: true })));
    await expect(fetchJson('/api/x', Schema)).resolves.toEqual({ value: 42 });
  });

  it('передаёт signal и Accept в fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ value: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    await fetchJson('/api/x', Schema, { signal: controller.signal });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({
        signal: controller.signal,
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    );
  });

  it('невалидный ответ → invalid-response с подробностями', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ value: 'не число' })));
    const error = await expectApiError(fetchJson('/api/x', Schema));
    expect(error.kind).toBe('invalid-response');
    expect(error.details).toContain('value');
  });

  it('не-JSON тело → invalid-response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));
    const error = await expectApiError(fetchJson('/api/x', Schema));
    expect(error.kind).toBe('invalid-response');
  });

  it('HTTP 500 → http с кодом и текстом ошибки сервера', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Имитация сбоя' }, { status: 500 })),
    );
    const error = await expectApiError(fetchJson('/api/x', Schema));
    expect(error.kind).toBe('http');
    expect(error.status).toBe(500);
    expect(error.details).toBe('Имитация сбоя');
  });

  it('сетевой сбой → network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await expectApiError(fetchJson('/api/x', Schema));
    expect(error.kind).toBe('network');
  });

  it('отменённый запрос → aborted', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      }),
    );
    const error = await expectApiError(fetchJson('/api/x', Schema, { signal: controller.signal }));
    expect(error.kind).toBe('aborted');
  });
});
