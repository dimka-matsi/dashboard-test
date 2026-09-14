import type { NodeChange } from '@staff-pulse/contracts';
import { describe, expect, it } from 'vitest';

import { makeOrgFixture } from '@/test/fixtures';

import { computeAggregates } from './aggregate';
import { applyNodeChanges } from './apply-changes';
import { buildOrgModel } from './org-model';

const AT = '2026-09-14T12:00:00.000Z';
const model = buildOrgModel(makeOrgFixture());

describe('applyNodeChanges', () => {
  it('меняет узел и агрегаты предков, остальные ссылки сохраняет', () => {
    const {
      model: next,
      changed,
      unknownIds,
    } = applyNodeChanges(model, [{ id: 'team-a1-1', fields: { headcount: 12 }, updatedAt: AT }]);

    expect(next).not.toBe(model);
    expect(unknownIds).toEqual([]);
    expect(next.tree.nodes.get('team-a1-1')).toMatchObject({ headcount: 12, updatedAt: AT });

    // структура и незатронутые узлы/агрегаты — те же объекты
    expect(next.tree.children).toBe(model.tree.children);
    expect(next.tree.order).toBe(model.tree.order);
    expect(next.tree.nodes.get('team-a1-2')).toBe(model.tree.nodes.get('team-a1-2'));
    expect(next.aggregates.get('team-a1-2')).toBe(model.aggregates.get('team-a1-2'));
    expect(next.aggregates.get('div-b')).toBe(model.aggregates.get('div-b'));

    // цепочка предков пересчитана: 31 + 2
    expect(next.aggregates.get('dep-a1')?.totalHeadcount).toBe(20);
    expect(next.aggregates.get('div-a')?.totalHeadcount).toBe(33);

    // у листа средняя эффективность равна собственной и от численности не зависит
    expect([...(changed.get('team-a1-1') ?? [])].sort()).toEqual(['headcount', 'totalHeadcount']);
    expect([...(changed.get('dep-a1') ?? [])].sort()).toEqual(['avgPerformance', 'totalHeadcount']);
    expect([...(changed.get('div-a') ?? [])].sort()).toEqual(['avgPerformance', 'totalHeadcount']);
    expect(changed.has('div-b')).toBe(false);
  });

  it('изменение бюджета не помечает эффективность как изменённую', () => {
    const { changed } = applyNodeChanges(model, [
      { id: 'team-b1-1', fields: { budget: 2_000_000 }, updatedAt: AT },
    ]);
    expect([...(changed.get('team-b1-1') ?? [])].sort()).toEqual(['budget', 'totalBudget']);
    expect([...(changed.get('div-b') ?? [])]).toEqual(['totalBudget']);
  });

  it('патч без реальных изменений возвращает ту же модель', () => {
    const current = model.tree.nodes.get('team-a1-1')!;
    const { model: next, changed } = applyNodeChanges(model, [
      { id: 'team-a1-1', fields: { headcount: current.headcount }, updatedAt: AT },
    ]);
    expect(next).toBe(model);
    expect(changed.size).toBe(0);
  });

  it('неизвестные id не ломают модель и возвращаются отдельно', () => {
    const { model: next, unknownIds } = applyNodeChanges(model, [
      { id: 'ghost', fields: { headcount: 1 }, updatedAt: AT },
      { id: 'team-a2-1', fields: { performance: 50 }, updatedAt: AT },
    ]);
    expect(unknownIds).toEqual(['ghost']);
    expect(next.tree.nodes.get('team-a2-1')?.performance).toBe(50);
  });

  it('инкрементальный пересчёт совпадает с полным на случайной серии патчей', () => {
    let current = model;
    const ids = [...model.tree.nodes.keys()];
    let seed = 12345;
    const rnd = (): number => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };

    for (let step = 0; step < 300; step += 1) {
      const changes: NodeChange[] = [];
      const count = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < count; i += 1) {
        const id = ids[Math.floor(rnd() * ids.length)]!;
        changes.push({
          id,
          fields: {
            headcount: Math.floor(rnd() * 20),
            budget: Math.floor(rnd() * 5_000_000),
            performance: Math.floor(rnd() * 101),
          },
          updatedAt: AT,
        });
      }
      current = applyNodeChanges(current, changes).model;

      const full = computeAggregates(current.tree);
      for (const id of ids) {
        const incremental = current.aggregates.get(id)!;
        const expected = full.get(id)!;
        expect(incremental.totalHeadcount).toBe(expected.totalHeadcount);
        expect(incremental.totalBudget).toBe(expected.totalBudget);
        expect(incremental.weightedPerformanceSum).toBe(expected.weightedPerformanceSum);
        if (expected.avgPerformance === null) expect(incremental.avgPerformance).toBeNull();
        else expect(incremental.avgPerformance).toBeCloseTo(expected.avgPerformance, 10);
      }
    }
  });
});
