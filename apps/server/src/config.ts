import { isLogLevel, type LogLevel } from './lib/logger';

export interface ServerConfig {
  host: string;
  port: number;
  /** Seed генератора данных: одинаковый seed даёт одинаковую орг-структуру. */
  seed: number;
  /** Разрешённый Origin для CORS (нужен только если клиент ходит на API напрямую, без прокси). */
  corsOrigin: string | null;
  logLevel: LogLevel;
  /** Период генерации live-изменений; 0 — отключить. */
  updateIntervalMs: number;
  /** Сколько узлов может измениться за один патч (1..N). */
  updateBatchMax: number;
  /** Период heartbeat (ping) по WebSocket. */
  heartbeatMs: number;
  /** Сколько последних патчей хранить для досылки при переподключении. */
  patchBufferSize: number;
  /** Ключ Anthropic API для AI-поиска; без ключа работает разбор правилами. */
  anthropicApiKey: string | null;
  anthropicModel: string;
  /** Таймаут запроса к модели, после которого используется разбор правилами. */
  aiTimeoutMs: number;
}

function readInt(env: NodeJS.ProcessEnv, name: string, fallback: number, min = 0): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min) {
    throw new Error(
      `Переменная окружения ${name} должна быть целым числом >= ${min}, получено "${raw}"`,
    );
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const logLevelRaw = env.LOG_LEVEL ?? 'info';
  if (!isLogLevel(logLevelRaw)) {
    throw new Error(
      `LOG_LEVEL должен быть одним из debug|info|warn|error, получено "${logLevelRaw}"`,
    );
  }
  return {
    host: env.SERVER_HOST ?? '0.0.0.0',
    port: readInt(env, 'SERVER_PORT', 3001, 0),
    seed: readInt(env, 'MOCK_SEED', 20260914, 0),
    corsOrigin: env.CORS_ORIGIN && env.CORS_ORIGIN.trim() !== '' ? env.CORS_ORIGIN.trim() : null,
    logLevel: logLevelRaw,
    updateIntervalMs: readInt(env, 'UPDATE_INTERVAL_MS', 3_000, 0),
    updateBatchMax: readInt(env, 'UPDATE_BATCH_MAX', 3, 1),
    heartbeatMs: readInt(env, 'HEARTBEAT_MS', 10_000, 1_000),
    patchBufferSize: readInt(env, 'PATCH_BUFFER_SIZE', 500, 1),
    anthropicApiKey:
      env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim() !== ''
        ? env.ANTHROPIC_API_KEY.trim()
        : null,
    anthropicModel:
      env.ANTHROPIC_MODEL && env.ANTHROPIC_MODEL.trim() !== ''
        ? env.ANTHROPIC_MODEL.trim()
        : 'claude-opus-5',
    aiTimeoutMs: readInt(env, 'AI_TIMEOUT_MS', 6_000, 500),
  };
}
