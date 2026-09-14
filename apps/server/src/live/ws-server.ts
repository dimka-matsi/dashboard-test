import type { IncomingMessage, Server } from 'node:http';

import {
  ClientMessageSchema,
  RESUME_QUERY_PARAMS,
  type PatchMessage,
  type ServerMessage,
} from '@staff-pulse/contracts';
import { WebSocket, WebSocketServer } from 'ws';
import * as z from 'zod/mini';

import type { Logger } from '../lib/logger';
import type { OrgState } from '../state';

export interface LiveServerOptions {
  httpServer: Server;
  state: OrgState;
  heartbeatMs: number;
  log: Logger;
  path?: string;
}

export interface LiveServer {
  broadcast(patch: PatchMessage): void;
  clientCount(): number;
  close(): Promise<void>;
}

/**
 * WebSocket-канал live-обновлений на том же HTTP-сервере (путь /ws).
 *
 * Протокол: после подключения сервер шлёт `hello`; если клиент передал курсор
 * `?serverId=…&since=…`, сервер досылает пропущенные патчи из буфера или `resync`,
 * когда дослать нечего (рестарт сервера, слишком большой разрыв, битый курсор).
 * Досылка выполняется синхронно в обработчике подключения, поэтому широковещательный
 * патч не может «вклиниться» между hello и досланными патчами: порядок seq на проводе строгий.
 */
export function attachLiveServer({
  httpServer,
  state,
  heartbeatMs,
  log,
  path = '/ws',
}: LiveServerOptions): LiveServer {
  const wss = new WebSocketServer({ noServer: true });
  const alive = new WeakMap<WebSocket, boolean>();

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== path) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const send = (message: ServerMessage): void => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    };

    alive.set(ws, true);
    send({ type: 'hello', serverId: state.serverId, seq: state.version, heartbeatMs });
    resume(ws, url, state, send, log);

    ws.on('message', (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        log.warn('WS: сообщение клиента не JSON');
        return;
      }
      const result = z.safeParse(ClientMessageSchema, parsed);
      if (!result.success) {
        log.warn('WS: сообщение клиента не соответствует контракту');
        return;
      }
      if (result.data.type === 'pong') alive.set(ws, true);
    });
    ws.on('pong', () => alive.set(ws, true));
    ws.on('error', (error) => log.warn('WS: ошибка соединения', { error: String(error) }));
    ws.on('close', () => log.debug('WS: клиент отключился', { clients: wss.clients.size }));
    log.debug('WS: клиент подключился', { clients: wss.clients.size });
  });

  // Heartbeat: прикладной ping (браузер отвечает сообщением pong) и протокольный ping
  // (браузер отвечает автоматически). Клиент, не ответивший за период, считается мёртвым.
  const heartbeat = setInterval(() => {
    const t = Date.now();
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        log.debug('WS: нет ответа на heartbeat, разрываем соединение');
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', t } satisfies ServerMessage));
        ws.ping();
      }
    }
  }, heartbeatMs);
  heartbeat.unref();

  return {
    broadcast(patch) {
      const data = JSON.stringify(patch);
      for (const ws of wss.clients) {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      }
    },
    clientCount: () => wss.clients.size,
    async close() {
      clearInterval(heartbeat);
      for (const ws of wss.clients) ws.close(1001, 'server shutdown');
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}

function resume(
  ws: WebSocket,
  url: URL,
  state: OrgState,
  send: (message: ServerMessage) => void,
  log: Logger,
): void {
  const serverId = url.searchParams.get(RESUME_QUERY_PARAMS.serverId);
  const sinceRaw = url.searchParams.get(RESUME_QUERY_PARAMS.since);
  if (serverId === null && sinceRaw === null) return;

  if (serverId !== state.serverId) {
    send({ type: 'resync', seq: state.version, reason: 'server-restarted' });
    return;
  }
  const since = Number(sinceRaw);
  if (!Number.isInteger(since) || since < 0) {
    send({ type: 'resync', seq: state.version, reason: 'unknown-cursor' });
    return;
  }
  const missed = state.patchesSince(since);
  if (missed === null) {
    send({ type: 'resync', seq: state.version, reason: 'gap-too-large' });
    return;
  }
  for (const patch of missed) send(patch);
  log.debug('WS: досланы пропущенные патчи', { since, count: missed.length });
  void ws;
}
