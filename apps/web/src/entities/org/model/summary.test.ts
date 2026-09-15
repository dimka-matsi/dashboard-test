import { describe, expect, it } from 'vitest';

import { makeOrgFixture } from '@/test/fixtures';

import { buildOrgModel } from './org-model';
import { summarize } from './summary';

describe('summarize', () => {
  const summary = summarize(buildOrgModel(makeOrgFixture()));

  it('складывает корни и считает взвешенную эффективность компании', () => {
    // div-a: 31 чел., W = 2095; div-b: 2 + 2 + 6 = 10 чел., W = 120 + 110 + 390 = 620
    expect(summary.totalHeadcount).toBe(41);
    expect(summary.totalBudget).toBe(24_700_000 + 5_000_000 + 1_000_000 + 1_800_000);
    expect(summary.avgPerformance).toBeCloseTo((2095 + 620) / 41, 10);
  });

  it('считает узлы по уровням и перечисляет дивизионы в порядке дерева', () => {
    expect([...summary.countsByLevel.entries()]).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
    expect(summary.divisions.map((d) => d.name)).toEqual(['Дивизион А', 'Дивизион Б']);
    expect(summary.divisions[1]?.avgPerformance).toBe(62);
  });

  it('пустая модель даёт нули и null', () => {
    const empty = summarize(buildOrgModel([]));
    expect(empty).toMatchObject({
      totalHeadcount: 0,
      totalBudget: 0,
      avgPerformance: null,
      divisions: [],
    });
  });
});
