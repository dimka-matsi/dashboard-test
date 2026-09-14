import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockWebSocket } from '@/test/mock-socket';

import { backoffDelay, buildUrl, LiveClient, type ConnectionStatus } from './live-client';

const HELLO = { type: 'hello', serverId: 'srv', seq: 7, heartbeatMs: 1_000 };

function createClient(overrides: Partial<ConstructorParameters<typeof LiveClient>[0]> = {}) {
  const statuses: ConnectionStatus[] = [];
  const messages: unknown[] = [];
  const client = new LiveClient({
    url: 'ws://test/ws',
    getCursor: () => null,
    onStatus: (status) => statuses.push(status),
    onMessage: (message) => messages.push(message),
    WebSocketImpl: MockWebSocket as unknown as typeof WebSocket,
    random: () => 0.5, // без джиттера
    ...overrides,
  });
  return { client, statuses, messages, last: () => statuses.at(-1)! };
}

describe('backoffDelay', () => {
  it('растёт экспоненциально и упирается в максимум', () => {
    const options = { baseMs: 500, maxMs: 30_000, factor: 2, jitter: 0 };
    expect([1, 2, 3, 4, 10].map((n) => backoffDelay(n, options))).toEqual([
      500, 1000, 2000, 4000, 30_000,
    ]);
  });

  it('джиттер держит задержку в пределах ±доли', () => {
    const options = { baseMs: 1000, maxMs: 30_000, factor: 2, jitter: 0.3 };
    expect(backoffDelay(1, options, () => 0)).toBe(700);
    expect(backoffDelay(1, options, () => 1)).toBe(1300);
  });
});

describe('buildUrl', () => {
  it('добавляет курсор возобновления только когда он полный', () => {
    expect(buildUrl('ws://h/ws', null)).toBe('ws://h/ws');
    expect(buildUrl('ws://h/ws', { serverId: 'srv', since: null })).toBe('ws://h/ws');
    expect(buildUrl('ws://h/ws', { serverId: 'srv', since: 7 })).toBe(
      'ws://h/ws?serverId=srv&since=7',
    );
  });
});

describe('LiveClient', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('подключается, становится online после hello и пробрасывает патчи', () => {
    const { client, last, messages } = createClient();
    client.start();
    expect(last()).toEqual({ state: 'connecting', attempt: 0 });

    const socket = MockWebSocket.last();
    socket.open();
    socket.message(HELLO);
    expect(last()).toMatchObject({ state: 'online', serverId: 'srv', seq: 7 });
    expect(messages).toEqual([HELLO]);

    socket.message({ type: 'patch', seq: 8, changes: [] });
    expect(last()).toMatchObject({ state: 'online', seq: 8 });
    expect(messages).toHaveLength(2);
    client.stop();
  });

  it('отвечает pong на ping и не пробрасывает его наружу', () => {
    const { client, messages } = createClient();
    client.start();
    const socket = MockWebSocket.last();
    socket.open();
    socket.message(HELLO);
    socket.message({ type: 'ping', t: 555 });
    expect(socket.sentMessages()).toEqual([{ type: 'pong', t: 555 }]);
    expect(messages.map((m) => (m as { type: string }).type)).toEqual(['hello']);
    client.stop();
  });

  it('игнорирует сообщения вне контракта', () => {
    const { client, messages } = createClient();
    client.start();
    const socket = MockWebSocket.last();
    socket.open();
    socket.message('не json');
    socket.message({ type: 'snapshot', nodes: [] });
    expect(messages).toEqual([]);
    client.stop();
  });

  it('переподключается с экспоненциальным backoff и курсором, сбрасывает попытки после hello', () => {
    const cursor = { serverId: 'srv', since: 7 };
    const { client, last } = createClient({ getCursor: () => cursor });
    client.start();
    expect(MockWebSocket.last().url).toBe('ws://test/ws?serverId=srv&since=7');

    MockWebSocket.last().serverClose(1006);
    expect(last()).toMatchObject({ state: 'reconnecting', attempt: 1 });
    expect(MockWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(499);
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(last()).toEqual({ state: 'connecting', attempt: 1 });

    MockWebSocket.last().serverClose(1006);
    expect(last()).toMatchObject({ state: 'reconnecting', attempt: 2 });
    vi.advanceTimersByTime(1_000);
    expect(MockWebSocket.instances).toHaveLength(3);

    MockWebSocket.last().serverClose(1006);
    expect(last()).toMatchObject({ state: 'reconnecting', attempt: 3 });
    vi.advanceTimersByTime(2_000);
    expect(MockWebSocket.instances).toHaveLength(4);

    MockWebSocket.last().open();
    MockWebSocket.last().message(HELLO);
    expect(last()).toMatchObject({ state: 'online' });

    // после успешного подключения счётчик обнулён: следующий обрыв ждёт снова 500 мс
    MockWebSocket.last().serverClose(1006);
    expect(last()).toMatchObject({ state: 'reconnecting', attempt: 1 });
    client.stop();
  });

  it('reconnectNow не ждёт таймер backoff', () => {
    const { client } = createClient();
    client.start();
    MockWebSocket.last().serverClose(1006);
    expect(MockWebSocket.instances).toHaveLength(1);
    client.reconnectNow();
    expect(MockWebSocket.instances).toHaveLength(2);
    client.stop();
  });

  it('watchdog: тишина дольше 2,5 heartbeat закрывает сокет и запускает переподключение', () => {
    const { client, last } = createClient();
    client.start();
    const socket = MockWebSocket.last();
    socket.open();
    socket.message(HELLO); // heartbeatMs = 1000

    vi.advanceTimersByTime(2_400);
    expect(last()).toMatchObject({ state: 'online' });
    vi.advanceTimersByTime(200);
    expect(socket.closeCalls).toEqual([{ code: 4000, reason: 'heartbeat timeout' }]);
    expect(last()).toMatchObject({ state: 'reconnecting', attempt: 1 });

    // события «мёртвого» сокета больше не влияют на клиент
    socket.serverClose(1006);
    expect(last()).toMatchObject({ state: 'reconnecting', attempt: 1 });
    client.stop();
  });

  it('stop закрывает сокет, переводит в offline и отменяет таймеры', () => {
    const { client, last } = createClient();
    client.start();
    MockWebSocket.last().serverClose(1006);
    client.stop();
    expect(last()).toEqual({ state: 'offline' });
    vi.advanceTimersByTime(60_000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
