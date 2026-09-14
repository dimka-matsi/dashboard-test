import { describe, expect, it } from 'vitest';

import { buildOrgModel } from '@/entities/org/model/org-model';
import { makeNode, makeOrgFixture } from '@/test/fixtures';

import { buildRows, filterRows, normalizeQuery, sortRows } from './rows';

const model = buildOrgModel(makeOrgFixture());
const rows = buildRows(model);
const names = (list: readonly { name: string }[]) => list.map((row) => row.name);

describe('buildRows', () => {
  it('строки идут в порядке дерева и содержат агрегаты и путь', () => {
    expect(names(rows)).toEqual([
      'Дивизион А',
      'Отдел А1',
      'Команда А1-1',
      'Команда А1-2',
      'Отдел А2',
      'Команда А2-1',
      'Дивизион Б',
      'Отдел Б1',
      'Команда Б1-1',
    ]);
    expect(rows[2]).toMatchObject({
      level: 3,
      levelLabel: 'Команда',
      path: 'Дивизион А › Отдел А1 › Команда А1-1',
      totalHeadcount: 10,
      totalBudget: 4_000_000,
      avgPerformance: 75,
    });
  });
});

describe('filterRows', () => {
  it('без запроса возвращает тот же массив (та же ссылка)', () => {
    expect(filterRows(rows, '')).toBe(rows);
    expect(filterRows(rows, '   ')).toBe(rows);
  });

  it('ищет подстроку без учёта регистра, лишних пробелов и ё/е', () => {
    expect(names(filterRows(rows, 'отдел'))).toEqual(['Отдел А1', 'Отдел А2', 'Отдел Б1']);
    expect(names(filterRows(rows, '  а1-2 '))).toEqual(['Команда А1-2']);
    expect(normalizeQuery('  Ёлки   ЗЕЛЁНЫЕ ')).toBe('елки зеленые');
  });

  it('ничего не найдено → пустой массив', () => {
    expect(filterRows(rows, 'нет такого')).toEqual([]);
  });
});

describe('sortRows', () => {
  it('без сортировки возвращает тот же массив', () => {
    expect(sortRows(rows, null)).toBe(rows);
  });

  it('по названию с учётом русской локали, обратное направление — зеркально', () => {
    const asc = names(sortRows(rows, { column: 'name', direction: 'asc' }));
    expect(asc[0]).toBe('Дивизион А');
    expect(asc.at(-1)).toBe('Отдел Б1');
    expect(names(sortRows(rows, { column: 'name', direction: 'desc' }))).toEqual(
      [...asc].reverse(),
    );
  });

  it('по численности; при равенстве сохраняется порядок дерева', () => {
    const sorted = sortRows(rows, { column: 'totalHeadcount', direction: 'asc' });
    const values = sorted.map((r) => r.totalHeadcount);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    // одинаковые значения: Команда А2-1 (8) и Отдел Б1 (8) — порядок как в дереве
    const eight = sorted.filter((r) => r.totalHeadcount === 8).map((r) => r.name);
    expect(eight).toEqual(['Команда А2-1', 'Отдел Б1']);
  });

  it('по бюджету и уровню', () => {
    expect(sortRows(rows, { column: 'totalBudget', direction: 'desc' })[0]?.name).toBe(
      'Дивизион А',
    );
    expect(sortRows(rows, { column: 'level', direction: 'desc' })[0]?.level).toBe(3);
  });

  it('null-эффективность всегда в конце, при любом направлении', () => {
    const withEmpty = buildRows(
      buildOrgModel([
        makeNode({ id: 'a', name: 'А', headcount: 5, performance: 50 }),
        makeNode({ id: 'z', name: 'Пустой', headcount: 0, performance: 0 }),
        makeNode({ id: 'b', name: 'Б', headcount: 5, performance: 90 }),
      ]),
    );
    expect(names(sortRows(withEmpty, { column: 'avgPerformance', direction: 'asc' }))).toEqual([
      'А',
      'Б',
      'Пустой',
    ]);
    expect(names(sortRows(withEmpty, { column: 'avgPerformance', direction: 'desc' }))).toEqual([
      'Б',
      'А',
      'Пустой',
    ]);
  });

  it('не мутирует исходный массив', () => {
    const before = names(rows);
    sortRows(rows, { column: 'name', direction: 'desc' });
    expect(names(rows)).toEqual(before);
  });
});
