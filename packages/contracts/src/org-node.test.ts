import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import { OrgNodeSchema, OrgTreeResponseSchema } from './org-node';

const validNode = {
  id: 'div-01',
  name: 'Дивизион «Продукты»',
  parentId: null,
  headcount: 5,
  budget: 12_345_678,
  performance: 77,
  updatedAt: '2026-09-14T10:00:00.000Z',
};

describe('OrgNodeSchema', () => {
  it('принимает корректный узел и отбрасывает лишние поля', () => {
    const result = z.safeParse(OrgNodeSchema, { ...validNode, extra: 'x' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validNode);
  });

  it('принимает дочерний узел с parentId', () => {
    expect(
      z.safeParse(OrgNodeSchema, { ...validNode, id: 'dep-01-01', parentId: 'div-01' }).success,
    ).toBe(true);
  });

  it.each([
    ['performance > 100', { performance: 101 }],
    ['performance < 0', { performance: -1 }],
    ['отрицательный headcount', { headcount: -3 }],
    ['дробный headcount', { headcount: 2.5 }],
    ['строка вместо headcount', { headcount: 'много' }],
    ['отрицательный бюджет', { budget: -1 }],
    ['пустое имя', { name: '' }],
    ['пустой id', { id: '' }],
    ['updatedAt не ISO-8601', { updatedAt: '14.09.2026' }],
    ['parentId undefined', { parentId: undefined }],
  ])('отклоняет узел: %s', (_label, patch) => {
    const result = z.safeParse(OrgNodeSchema, { ...validNode, ...patch });
    expect(result.success).toBe(false);
  });
});

describe('OrgTreeResponseSchema', () => {
  it('принимает пустой массив', () => {
    expect(z.safeParse(OrgTreeResponseSchema, []).success).toBe(true);
  });

  it('один невалидный элемент делает невалидным весь ответ', () => {
    const result = z.safeParse(OrgTreeResponseSchema, [
      validNode,
      { ...validNode, id: 'x', performance: 250 },
    ]);
    expect(result.success).toBe(false);
  });

  it('отклоняет объект вместо массива', () => {
    expect(z.safeParse(OrgTreeResponseSchema, { nodes: [validNode] }).success).toBe(false);
  });
});
