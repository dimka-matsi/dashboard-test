import { describe, expect, it } from 'vitest';

import { parseWithRules } from './rules';

describe('parseWithRules', () => {
  it.each([
    ['отделы с эффективностью ниже 50', { levels: [2], performance: { max: 50 } }],
    ['команды с эффективностью выше 80', { levels: [3], performance: { min: 80 } }],
    ['дивизионы с бюджетом больше 200 млн', { levels: [1], budget: { min: 200_000_000 } }],
    ['команды от 10 человек', { levels: [3], headcount: { min: 10 } }],
    ['отделы где сотрудников больше 30', { levels: [2], headcount: { min: 30 } }],
    ['эффективность от 40 до 60', { performance: { min: 40, max: 60 } }],
    ['бюджет между 10 и 50 млн', { budget: { min: 10_000_000, max: 50_000_000 } }],
    ['команды в дивизионе Платформа', { levels: [3], within: 'платформа' }],
    [
      'команды в дивизионе Платформа с эффективностью выше 70',
      { levels: [3], within: 'платформа', performance: { min: 70 } },
    ],
    [
      'топ 5 команд по эффективности',
      { levels: [3], sort: { column: 'avgPerformance', direction: 'desc' }, limit: 5 },
    ],
    [
      '5 худших отделов по эффективности',
      { levels: [2], sort: { column: 'avgPerformance', direction: 'asc' }, limit: 5 },
    ],
    [
      'самые большие команды по численности',
      { levels: [3], sort: { column: 'totalHeadcount', direction: 'desc' } },
    ],
    ['отделы маркетинга', { levels: [2], text: 'маркетинга' }],
    ['teams with performance below 40', { levels: [3], performance: { max: 40 } }],
    ['команды из отдела продаж', { levels: [3], within: 'продаж' }],
    ['команды в которых больше 10 человек', { levels: [3], headcount: { min: 10 } }],
  ])('«%s»', (query, expected) => {
    expect(parseWithRules(query)).toEqual(expected);
  });

  it('обычный текст без условий → null (текстовый поиск на клиенте)', () => {
    expect(parseWithRules('платформа')).toBeNull();
    expect(parseWithRules('Data Platform')).toBeNull();
    expect(parseWithRules('   ')).toBeNull();
  });

  it('проценты и «тыс» понимаются как единицы', () => {
    expect(parseWithRules('эффективность меньше 60%')).toEqual({ performance: { max: 60 } });
    expect(parseWithRules('бюджет до 500 тыс')).toEqual({ budget: { max: 500_000 } });
  });
});
