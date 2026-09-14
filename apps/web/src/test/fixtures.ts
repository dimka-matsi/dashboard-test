import type { OrgNode } from '@staff-pulse/contracts';

let counter = 0;

/** Узел с разумными значениями по умолчанию; любые поля можно переопределить. */
export function makeNode(overrides: Partial<OrgNode> & Pick<OrgNode, 'id'>): OrgNode {
  counter += 1;
  return {
    name: `Узел ${overrides.id}`,
    parentId: null,
    headcount: 10,
    budget: 1_000_000,
    performance: 70,
    updatedAt: new Date(Date.UTC(2026, 8, 14, 10, counter % 60)).toISOString(),
    ...overrides,
  };
}

/**
 * Небольшая структура на три уровня:
 * Дивизион А → Отдел А1 (Команда А1-1, Команда А1-2), Отдел А2 (Команда А2-1)
 * Дивизион Б → Отдел Б1 (Команда Б1-1)
 */
export function makeOrgFixture(): OrgNode[] {
  return [
    makeNode({
      id: 'div-a',
      name: 'Дивизион А',
      headcount: 4,
      budget: 10_000_000,
      performance: 80,
    }),
    makeNode({ id: 'div-b', name: 'Дивизион Б', headcount: 2, budget: 5_000_000, performance: 60 }),
    makeNode({
      id: 'dep-a1',
      name: 'Отдел А1',
      parentId: 'div-a',
      headcount: 3,
      budget: 3_000_000,
      performance: 90,
    }),
    makeNode({
      id: 'dep-a2',
      name: 'Отдел А2',
      parentId: 'div-a',
      headcount: 1,
      budget: 2_000_000,
      performance: 40,
    }),
    makeNode({
      id: 'dep-b1',
      name: 'Отдел Б1',
      parentId: 'div-b',
      headcount: 2,
      budget: 1_000_000,
      performance: 55,
    }),
    makeNode({
      id: 'team-a1-1',
      name: 'Команда А1-1',
      parentId: 'dep-a1',
      headcount: 10,
      budget: 4_000_000,
      performance: 75,
    }),
    makeNode({
      id: 'team-a1-2',
      name: 'Команда А1-2',
      parentId: 'dep-a1',
      headcount: 5,
      budget: 2_500_000,
      performance: 95,
    }),
    makeNode({
      id: 'team-a2-1',
      name: 'Команда А2-1',
      parentId: 'dep-a2',
      headcount: 8,
      budget: 3_200_000,
      performance: 30,
    }),
    makeNode({
      id: 'team-b1-1',
      name: 'Команда Б1-1',
      parentId: 'dep-b1',
      headcount: 6,
      budget: 1_800_000,
      performance: 65,
    }),
  ];
}

/** Ответ fetch с JSON-телом. */
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}
