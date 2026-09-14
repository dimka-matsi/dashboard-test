import { describe, expect, it } from 'vitest';

import { makeNode, makeOrgFixture } from '@/test/fixtures';

import { aggregateNode, computeAggregates } from './aggregate';
import { buildOrgTree } from './build-org-tree';

describe('computeAggregates', () => {
  const tree = buildOrgTree(makeOrgFixture());
  const aggregates = computeAggregates(tree);

  it('у листа агрегаты равны собственным значениям', () => {
    expect(aggregates.get('team-a1-1')).toEqual({
      id: 'team-a1-1',
      totalHeadcount: 10,
      totalBudget: 4_000_000,
      weightedPerformanceSum: 750,
      avgPerformance: 75,
    });
  });

  it('у отдела — собственные значения плюс команды', () => {
    // dep-a1: 3 чел. × 90 + team-a1-1: 10 × 75 + team-a1-2: 5 × 95
    const dep = aggregates.get('dep-a1');
    expect(dep?.totalHeadcount).toBe(18);
    expect(dep?.totalBudget).toBe(3_000_000 + 4_000_000 + 2_500_000);
    expect(dep?.weightedPerformanceSum).toBe(270 + 750 + 475);
    expect(dep?.avgPerformance).toBeCloseTo(1495 / 18, 10);
  });

  it('у дивизиона — вся ветка на три уровня', () => {
    const div = aggregates.get('div-a');
    expect(div?.totalHeadcount).toBe(4 + 18 + 9);
    expect(div?.totalBudget).toBe(10_000_000 + 9_500_000 + 5_200_000);
    // 80×4 + (1495) + (40×1 + 30×8)
    expect(div?.weightedPerformanceSum).toBe(320 + 1495 + 280);
    expect(div?.avgPerformance).toBeCloseTo(2095 / 31, 10);
  });

  it('средняя эффективность взвешена по численности, а не среднее арифметическое', () => {
    const local = buildOrgTree([
      makeNode({ id: 'p', headcount: 0, budget: 0, performance: 0 }),
      makeNode({ id: 'big', parentId: 'p', headcount: 90, performance: 90 }),
      makeNode({ id: 'small', parentId: 'p', headcount: 10, performance: 10 }),
    ]);
    expect(computeAggregates(local).get('p')?.avgPerformance).toBeCloseTo(82, 10);
  });

  it('нулевая численность даёт null вместо деления на ноль', () => {
    const local = buildOrgTree([makeNode({ id: 'p', headcount: 0, budget: 100, performance: 50 })]);
    expect(computeAggregates(local).get('p')).toMatchObject({
      totalHeadcount: 0,
      totalBudget: 100,
      avgPerformance: null,
    });
  });

  it('инвариант: агрегат узла = собственные значения + агрегаты детей (для каждого узла)', () => {
    for (const id of tree.order) {
      const node = tree.nodes.get(id)!;
      const aggregate = aggregates.get(id)!;
      const children = tree.children.get(id) ?? [];
      const childHeadcount = children.reduce(
        (sum, c) => sum + aggregates.get(c)!.totalHeadcount,
        0,
      );
      const childBudget = children.reduce((sum, c) => sum + aggregates.get(c)!.totalBudget, 0);
      expect(aggregate.totalHeadcount).toBe(node.headcount + childHeadcount);
      expect(aggregate.totalBudget).toBe(node.budget + childBudget);
    }
  });

  it('aggregateNode совпадает с полным пересчётом для любого узла', () => {
    for (const id of tree.order) {
      expect(aggregateNode(tree, aggregates, id)).toEqual(aggregates.get(id));
    }
  });
});
