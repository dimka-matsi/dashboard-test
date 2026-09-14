import { OrgNodeSchema } from '@staff-pulse/contracts';
import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import { generateOrgNodes } from './generate';

const NOW = Date.parse('2026-09-14T12:00:00.000Z');

describe('generateOrgNodes', () => {
  const nodes = generateOrgNodes(42, NOW);

  it('генерирует не меньше 40 узлов', () => {
    expect(nodes.length).toBeGreaterThanOrEqual(40);
  });

  it('каждый узел проходит схему контракта', () => {
    for (const node of nodes) {
      const result = z.safeParse(OrgNodeSchema, node);
      expect(
        result.success,
        `узел ${node.id}: ${result.success ? '' : z.prettifyError(result.error)}`,
      ).toBe(true);
    }
  });

  it('идентификаторы уникальны, родители существуют', () => {
    const ids = new Set(nodes.map((n) => n.id));
    expect(ids.size).toBe(nodes.length);
    for (const node of nodes) {
      if (node.parentId !== null) expect(ids.has(node.parentId)).toBe(true);
    }
  });

  it('иерархия имеет ровно три уровня', () => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const depthOf = (id: string): number => {
      let depth = 1;
      let current = byId.get(id);
      while (current?.parentId) {
        depth += 1;
        current = byId.get(current.parentId);
      }
      return depth;
    };
    const depths = new Set(nodes.map((n) => depthOf(n.id)));
    expect([...depths].sort()).toEqual([1, 2, 3]);
  });

  it('детерминирован: одинаковый seed даёт одинаковые данные', () => {
    expect(generateOrgNodes(42, NOW)).toEqual(nodes);
    expect(generateOrgNodes(43, NOW)).not.toEqual(nodes);
  });
});
