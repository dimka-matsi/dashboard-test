import { createServer } from 'node:http';

import { loadConfig } from './config';
import { generateOrgNodes } from './data/generate';
import { createRequestHandler } from './http/handler';
import { loadDotEnv } from './lib/dotenv';
import { createLogger } from './lib/logger';
import { startTicker } from './live/ticker';
import { attachLiveServer } from './live/ws-server';
import { createSearchService } from './search';
import { OrgState } from './state';

const envFile = loadDotEnv();
const config = loadConfig();
const log = createLogger(config.logLevel);
if (envFile) log.debug(`Загружен ${envFile}`);

const state = new OrgState(generateOrgNodes(config.seed), undefined, config.patchBufferSize);
const search = createSearchService({ config, log });
const server = createServer(createRequestHandler({ state, config, log, search }));
const live = attachLiveServer({ httpServer: server, state, heartbeatMs: config.heartbeatMs, log });

const stopTicker = startTicker({
  state,
  intervalMs: config.updateIntervalMs,
  batchMax: config.updateBatchMax,
  onPatch: (patch) => {
    live.broadcast(patch);
    log.debug('patch', { seq: patch.seq, nodes: patch.changes.map((c) => c.id) });
  },
});

server.listen(config.port, config.host, () => {
  log.info(`Mock API слушает http://${config.host}:${config.port}`, {
    nodes: state.size,
    seed: config.seed,
    serverId: state.serverId,
    updateIntervalMs: config.updateIntervalMs,
    aiSearch: search.llmEnabled ? `llm (${config.anthropicModel})` : 'rules',
  });
});

function shutdown(signal: NodeJS.Signals): void {
  log.info(`Получен ${signal}, останавливаемся`);
  stopTicker();
  void live.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
