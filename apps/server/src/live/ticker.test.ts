import { OrgNodeSchema } from '@staff-pulse/contracts';
import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import { generateOrgNodes } from '../data/generate';
import { createPrng } from '../data/prng';
import { OrgState } from '../state';
import { generateTick } from './ticker';

describe('generateTick', () => {
  it('порождает валидные изменения, узлы после применения проходят схему', () => {
    const state = new OrgState(generateOrgNodes(3), 'srv');
    const rnd = createPrng(99);
    const now = Date.parse('2026-09-14T12:00:00Z');
    let applied = 0;

    for (let i = 0; i < 400; i += 1) {
      const changes = generateTick(state, rnd, 3, now + i * 1000);
      expect(changes.length).toBeGreaterThanOrEqual(1);
      expect(changes.length).toBeLessThanOrEqual(3);
      expect(new Set(changes.map((c) => c.id)).size).toBe(changes.length);
      const patch = state.applyChanges(changes);
      if (patch) applied += 1;
    }

    expect(applied).toBeGreaterThan(300);
    for (const node of state.snapshot()) {
      const result = z.safeParse(OrgNodeSchema, node);
      expect(
        result.success,
        `узел ${node.id}: ${result.success ? '' : z.prettifyError(result.error)}`,
      ).toBe(true);
    }
  });

  it('численность команд не падает до нуля', () => {
    const state = new OrgState(generateOrgNodes(5), 'srv');
    const rnd = createPrng(7);
    for (let i = 0; i < 2000; i += 1) {
      state.applyChanges(generateTick(state, rnd, 3, Date.now()));
    }
    const parents = new Set(state.snapshot().map((n) => n.parentId));
    for (const node of state.snapshot()) {
      if (!parents.has(node.id)) expect(node.headcount).toBeGreaterThanOrEqual(1);
    }
  });
});
