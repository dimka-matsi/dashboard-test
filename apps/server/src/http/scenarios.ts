import type { OrgNode } from '@staff-pulse/contracts';

/**
 * Сценарии для проверки состояний клиента без правки кода:
 * GET /api/org-tree?scenario=empty|error|invalid|slow
 */
export const SCENARIOS = ['empty', 'error', 'invalid', 'slow'] as const;

export type Scenario = (typeof SCENARIOS)[number];

export const SLOW_SCENARIO_DELAY_MS = 2_500;

export function parseScenario(value: string | null): Scenario | null {
  return value && (SCENARIOS as readonly string[]).includes(value) ? (value as Scenario) : null;
}

/** Ломает ответ так, чтобы он не прошёл валидацию схемы на клиенте. */
export function corruptNodes(nodes: readonly OrgNode[]): unknown[] {
  return nodes.map((node, index) => {
    if (index === 0) return { ...node, performance: 250 };
    if (index === 1) {
      const { name: _dropped, ...rest } = node;
      return rest;
    }
    if (index === 2) return { ...node, headcount: 'много' };
    return node;
  });
}
