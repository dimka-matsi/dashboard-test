import type { IncomingMessage, ServerResponse } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

import type { ServerConfig } from '../config';
import type { Logger } from '../lib/logger';
import type { OrgState } from '../state';
import { matchesEtag, PayloadError, sendEmpty, sendJson } from './json';
import { corruptNodes, parseScenario, SLOW_SCENARIO_DELAY_MS } from './scenarios';

export interface HandlerDeps {
  state: OrgState;
  config: Pick<ServerConfig, 'corsOrigin'>;
  log: Logger;
}

export type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

export function createRequestHandler({ state, config, log }: HandlerDeps): RequestHandler {
  return (req, res) => {
    const startedAt = performance.now();
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    res.on('finish', () => {
      log.debug(`${req.method} ${url.pathname}${url.search} -> ${res.statusCode}`, {
        ms: Math.round(performance.now() - startedAt),
      });
    });

    if (config.corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-None-Match');
      res.setHeader('Access-Control-Expose-Headers', 'ETag');
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        sendEmpty(res, 204);
        return;
      }
    }

    route(req, res, url, state).catch((error: unknown) => {
      if (error instanceof PayloadError) {
        sendJson(res, error.status, { error: error.message });
        return;
      }
      log.error('Необработанная ошибка запроса', { error: String(error) });
      if (!res.headersSent) sendJson(res, 500, { error: 'Внутренняя ошибка сервера' });
      else res.end();
    });
  };
}

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  state: OrgState,
): Promise<void> {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      serverId: state.serverId,
      seq: state.version,
      nodes: state.size,
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/org-tree') {
    await handleOrgTree(req, res, url, state);
    return;
  }

  sendJson(res, 404, { error: `Маршрут ${req.method ?? ''} ${url.pathname} не найден` });
}

async function handleOrgTree(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  state: OrgState,
): Promise<void> {
  const scenario = parseScenario(url.searchParams.get('scenario'));

  if (scenario === 'slow') await delay(SLOW_SCENARIO_DELAY_MS);
  if (scenario === 'error') {
    sendJson(res, 500, { error: 'Имитация сбоя сервера (scenario=error)' });
    return;
  }
  if (scenario === 'empty') {
    sendJson(res, 200, [], { 'Cache-Control': 'no-store' });
    return;
  }
  if (scenario === 'invalid') {
    sendJson(res, 200, corruptNodes(state.snapshot()), { 'Cache-Control': 'no-store' });
    return;
  }

  // no-cache = «кэшируй, но всегда перепроверяй». Пока данные не менялись,
  // ETag прежний, и браузер получает 304 без тела.
  const etag = state.etag();
  const headers = { ETag: etag, 'Cache-Control': 'no-cache' };
  if (matchesEtag(req.headers['if-none-match'], etag)) {
    sendEmpty(res, 304, headers);
    return;
  }
  sendJson(res, 200, state.snapshot(), headers);
}
