import { createServer } from 'node:http';

import { loadConfig } from './config';
import { generateOrgNodes } from './data/generate';
import { createRequestHandler } from './http/handler';
import { loadDotEnv } from './lib/dotenv';
import { createLogger } from './lib/logger';
import { OrgState } from './state';

const envFile = loadDotEnv();
const config = loadConfig();
const log = createLogger(config.logLevel);
if (envFile) log.debug(`Загружен ${envFile}`);

const state = new OrgState(generateOrgNodes(config.seed));
const server = createServer(createRequestHandler({ state, config, log }));

server.listen(config.port, config.host, () => {
  log.info(`Mock API слушает http://${config.host}:${config.port}`, {
    nodes: state.size,
    seed: config.seed,
    serverId: state.serverId,
  });
});

function shutdown(signal: NodeJS.Signals): void {
  log.info(`Получен ${signal}, останавливаемся`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
