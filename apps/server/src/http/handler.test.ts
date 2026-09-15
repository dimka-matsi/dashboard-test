import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { OrgTreeResponseSchema } from '@staff-pulse/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import { generateOrgNodes } from '../data/generate';
import { silentLogger } from '../lib/logger';
import { createSearchService } from '../search';
import { OrgState } from '../state';
import { createRequestHandler } from './handler';

let server: Server;
let base = '';

beforeAll(async () => {
  const state = new OrgState(
    generateOrgNodes(7, Date.parse('2026-09-14T00:00:00Z')),
    'test-server',
  );
  const search = createSearchService({
    config: { anthropicApiKey: null, anthropicModel: 'test', aiTimeoutMs: 1000 },
    log: silentLogger,
  });
  server = createServer(
    createRequestHandler({ state, config: { corsOrigin: null }, log: silentLogger, search }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('GET /api/org-tree', () => {
  it('возвращает валидный плоский массив с ETag и Cache-Control: no-cache', async () => {
    const res = await fetch(`${base}/api/org-tree`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('etag')).toMatch(/^W\/"test-server-0"$/);
    expect(res.headers.get('cache-control')).toBe('no-cache');
    const parsed = z.safeParse(OrgTreeResponseSchema, await res.json());
    expect(parsed.success).toBe(true);
    expect(parsed.data?.length).toBeGreaterThanOrEqual(40);
  });

  it('отвечает 304 на актуальный If-None-Match', async () => {
    const first = await fetch(`${base}/api/org-tree`);
    const etag = first.headers.get('etag') ?? '';
    const second = await fetch(`${base}/api/org-tree`, { headers: { 'If-None-Match': etag } });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
  });

  it('отвечает 200 на устаревший If-None-Match', async () => {
    const res = await fetch(`${base}/api/org-tree`, {
      headers: { 'If-None-Match': 'W/"other-99"' },
    });
    expect(res.status).toBe(200);
  });

  it('scenario=empty → пустой массив', async () => {
    const res = await fetch(`${base}/api/org-tree?scenario=empty`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('scenario=error → 500 с описанием', async () => {
    const res = await fetch(`${base}/api/org-tree?scenario=error`);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('scenario=error') });
  });

  it('scenario=invalid → ответ не проходит схему контракта', async () => {
    const res = await fetch(`${base}/api/org-tree?scenario=invalid`);
    expect(res.status).toBe(200);
    expect(z.safeParse(OrgTreeResponseSchema, await res.json()).success).toBe(false);
  });
});

describe('прочие маршруты', () => {
  it('GET /api/health', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, serverId: 'test-server', seq: 0 });
  });

  it('неизвестный маршрут → 404 JSON', async () => {
    const res = await fetch(`${base}/api/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: expect.any(String) });
  });

  it('POST /api/search/parse разбирает запрос правилами', async () => {
    const res = await fetch(`${base}/api/search/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'отделы с эффективностью ниже 50' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      source: 'rules',
      filter: { levels: [2], performance: { max: 50 } },
    });
  });

  it('POST /api/search/parse без query → 400', async () => {
    const res = await fetch(`${base}/api/search/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'x' }),
    });
    expect(res.status).toBe(400);
    const notJson = await fetch(`${base}/api/search/parse`, { method: 'POST', body: '{oops' });
    expect(notJson.status).toBe(400);
  });
});
