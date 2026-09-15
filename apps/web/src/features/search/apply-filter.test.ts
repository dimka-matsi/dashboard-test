import { describe, expect, it } from 'vitest';

import { buildRows } from '@/features/analytics-table/rows';
import { buildOrgModel } from '@/entities/org/model/org-model';
import { makeOrgFixture } from '@/test/fixtures';

import { applySearchFilter, looksLikeNaturalLanguage } from './apply-filter';

const model = buildOrgModel(makeOrgFixture());
const rows = buildRows(model);
const names = (list: readonly { name: string }[]) => list.map((r) => r.name);

describe('applySearchFilter', () => {
  it('фильтрует по уровню и диапазону метрики (суммарные показатели)', () => {
    expect(
      names(applySearchFilter(rows, { levels: [2], performance: { max: 65 } }, model.tree)),
    ).toEqual(['Отдел А2', 'Отдел Б1']);
    expect(names(applySearchFilter(rows, { headcount: { min: 15 } }, model.tree))).toEqual([
      'Дивизион А',
      'Отдел А1',
    ]);
  });

  it('within сравнивает с названиями предков', () => {
    expect(
      names(applySearchFilter(rows, { levels: [3], within: 'дивизион б' }, model.tree)),
    ).toEqual(['Команда Б1-1']);
  });

  it('сортировка и ограничение применяются после фильтрации', () => {
    expect(
      names(
        applySearchFilter(
          rows,
          { levels: [3], sort: { column: 'avgPerformance', direction: 'desc' }, limit: 2 },
          model.tree,
        ),
      ),
    ).toEqual(['Команда А1-2', 'Команда А1-1']);
  });

  it('text работает как подстрока названия; пустой фильтр возвращает все строки', () => {
    expect(names(applySearchFilter(rows, { text: 'б1' }, model.tree))).toEqual([
      'Отдел Б1',
      'Команда Б1-1',
    ]);
    expect(applySearchFilter(rows, {}, model.tree)).toHaveLength(rows.length);
  });

  it('строки без эффективности не проходят условие по ней', () => {
    const withEmpty = buildRows(
      buildOrgModel([
        ...makeOrgFixture(),
        { ...makeOrgFixture()[0]!, id: 'empty', name: 'Пустой', headcount: 0 },
      ]),
    );
    expect(
      names(applySearchFilter(withEmpty, { performance: { min: 0 } }, model.tree)),
    ).not.toContain('Пустой');
  });
});

describe('looksLikeNaturalLanguage', () => {
  it('одно слово — просто подстрока, фраза или число — запрос', () => {
    expect(looksLikeNaturalLanguage('платформа')).toBe(false);
    expect(looksLikeNaturalLanguage('отделы с эффективностью ниже 50')).toBe(true);
    expect(looksLikeNaturalLanguage('топ5')).toBe(true);
    expect(looksLikeNaturalLanguage('ab')).toBe(false);
  });
});
