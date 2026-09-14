import { isLogLevel, type LogLevel } from './lib/logger';

export interface ServerConfig {
  host: string;
  port: number;
  /** Seed генератора данных: одинаковый seed даёт одинаковую орг-структуру. */
  seed: number;
  /** Разрешённый Origin для CORS (нужен только если клиент ходит на API напрямую, без прокси). */
  corsOrigin: string | null;
  logLevel: LogLevel;
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
  };
}
