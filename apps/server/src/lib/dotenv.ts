import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Загружает ближайший .env, поднимаясь от cwd вверх (не выше трёх уровней).
 * Использует встроенный process.loadEnvFile — без зависимости от dotenv.
 * Уже установленные переменные окружения имеют приоритет.
 */
export function loadDotEnv(startDir: string = process.cwd(), maxLevels = 3): string | null {
  let dir = startDir;
  for (let level = 0; level <= maxLevels; level += 1) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) {
      try {
        process.loadEnvFile(candidate);
        return candidate;
      } catch {
        return null;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
