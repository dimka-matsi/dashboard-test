import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { ServerMessageSchema, type ServerMessage } from '@staff-pulse/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import { generateOrgNodes } from '../data/generate';
import { silentLogger } from '../lib/logger';
import { OrgState } from '../state';
import { attachLiveServer, type LiveServer } from './ws-server';

const NOW = '2026-09-14T12:00:00.000Z';
let server: Server;
let live: LiveServer;
let state: OrgState;
let wsUrl = '';

beforeAll(async () => {
  state = new OrgState(generateOrgNodes(11), 'srv-test', 3);
  server = createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });
  live = attachLiveServer({ httpServer: server, state, heartbeatMs: 60_000, log: silentLogger });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  wsUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws`;
});

afterAll(async () => {
  await live.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** Открывает соединение и собирает первые `count` сообщений. */
function collect(
  url: string,
  count: number,
  timeoutMs = 3000,
): Promise<{ messages: ServerMessage[]; ws: WebSocket }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messages: ServerMessage[] = [];
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`получено ${messages.length} из ${count} сообщений`));
    }, timeoutMs);
    ws.addEventListener('message', (event) => {
      const parsed = z.safeParse(ServerMessageSchema, JSON.parse(String(event.data)));
      if (!parsed.success) {
        reject(new Error('сообщение не соответствует контракту'));
        return;
      }
      messages.push(parsed.data);
      if (messages.length >= count) {
        clearTimeout(timer);
        resolve({ messages, ws });
      }
    });
    ws.addEventListener('error', () => reject(new Error('ошибка WebSocket')));
  });
}

describe('WebSocket live-канал', () => {
  it('первым сообщением приходит hello с serverId и текущим seq', async () => {
    const { messages, ws } = await collect(wsUrl, 1);
    expect(messages[0]).toEqual({
      type: 'hello',
      serverId: 'srv-test',
      seq: 0,
      heartbeatMs: 60_000,
    });
    ws.close();
  });

  it('патч рассылается всем подключённым клиентам', async () => {
    const a = collect(wsUrl, 2);
    const b = collect(wsUrl, 2);
    // ждём подключения обоих (hello), затем меняем состояние
    await new Promise((r) => setTimeout(r, 100));
    const patch = state.applyChanges([
      { id: 'div-01', fields: { performance: 61 }, updatedAt: NOW },
    ]);
    expect(patch).not.toBeNull();
    live.broadcast(patch!);

    for (const pending of [a, b]) {
      const { messages, ws } = await pending;
      expect(messages[1]).toEqual(patch);
      ws.close();
    }
  });

  it('переподключение с курсором досылает пропущенные патчи', async () => {
    const since = state.version;
    const p1 = state.applyChanges([
      { id: 'div-02', fields: { budget: 5_000_000 }, updatedAt: NOW },
    ]);
    const p2 = state.applyChanges([{ id: 'div-03', fields: { headcount: 9 }, updatedAt: NOW }]);
    const { messages, ws } = await collect(`${wsUrl}?serverId=srv-test&since=${since}`, 3);
    expect(messages[0]?.type).toBe('hello');
    expect(messages[1]).toEqual(p1);
    expect(messages[2]).toEqual(p2);
    ws.close();
  });

  it('чужой serverId → resync (server-restarted)', async () => {
    const { messages, ws } = await collect(`${wsUrl}?serverId=old-process&since=1`, 2);
    expect(messages[1]).toMatchObject({
      type: 'resync',
      reason: 'server-restarted',
      seq: state.version,
    });
    ws.close();
  });

  it('разрыв больше буфера → resync (gap-too-large)', async () => {
    for (let i = 0; i < 5; i += 1) {
      state.applyChanges([{ id: 'div-04', fields: { performance: 70 + i }, updatedAt: NOW }]);
    }
    const { messages, ws } = await collect(`${wsUrl}?serverId=srv-test&since=0`, 2);
    expect(messages[1]).toMatchObject({ type: 'resync', reason: 'gap-too-large' });
    ws.close();
  });

  it('битый курсор → resync (unknown-cursor)', async () => {
    const { messages, ws } = await collect(`${wsUrl}?serverId=srv-test&since=abc`, 2);
    expect(messages[1]).toMatchObject({ type: 'resync', reason: 'unknown-cursor' });
    ws.close();
  });

  it('другой путь не апгрейдится', async () => {
    await expect(
      new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl.replace('/ws', '/other'));
        ws.addEventListener('open', () => resolve('open'));
        ws.addEventListener('error', () => reject(new Error('refused')));
      }),
    ).rejects.toThrow('refused');
  });
});
