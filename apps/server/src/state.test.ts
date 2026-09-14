import { describe, expect, it } from 'vitest';

import { generateOrgNodes } from './data/generate';
import { OrgState } from './state';

const NOW = '2026-09-14T12:00:00.000Z';

describe('OrgState.applyChanges', () => {
  it('увеличивает seq на 1, меняет ETag и снимок', () => {
    const state = new OrgState(generateOrgNodes(1), 'srv');
    const etagBefore = state.etag();
    const patch = state.applyChanges([
      { id: 'div-01', fields: { performance: 42 }, updatedAt: NOW },
    ]);

    expect(patch).toMatchObject({ type: 'patch', seq: 1 });
    expect(state.version).toBe(1);
    expect(state.etag()).not.toBe(etagBefore);
    expect(state.get('div-01')).toMatchObject({ performance: 42, updatedAt: NOW });
    expect(state.snapshot().find((n) => n.id === 'div-01')?.performance).toBe(42);
  });

  it('игнорирует неизвестные узлы; пустой патч не меняет версию', () => {
    const state = new OrgState(generateOrgNodes(1), 'srv');
    expect(state.applyChanges([{ id: 'ghost', fields: { budget: 1 }, updatedAt: NOW }])).toBeNull();
    expect(state.version).toBe(0);
  });

  it('не мутирует прежние объекты узлов', () => {
    const state = new OrgState(generateOrgNodes(1), 'srv');
    const before = state.get('div-01');
    state.applyChanges([{ id: 'div-01', fields: { headcount: 99 }, updatedAt: NOW }]);
    expect(before?.headcount).not.toBe(99);
  });
});

describe('OrgState.patchesSince', () => {
  const state = new OrgState(generateOrgNodes(1), 'srv', 3);
  for (let i = 1; i <= 5; i += 1) {
    state.applyChanges([{ id: 'div-01', fields: { performance: 50 + i }, updatedAt: NOW }]);
  }

  it('актуальный клиент не получает ничего', () => {
    expect(state.patchesSince(5)).toEqual([]);
    expect(state.patchesSince(7)).toEqual([]);
  });

  it('досылает патчи в пределах буфера', () => {
    expect(state.patchesSince(3)?.map((p) => p.seq)).toEqual([4, 5]);
    expect(state.patchesSince(2)?.map((p) => p.seq)).toEqual([3, 4, 5]);
  });

  it('за пределами буфера возвращает null (нужен снимок)', () => {
    expect(state.patchesSince(1)).toBeNull();
    expect(state.patchesSince(0)).toBeNull();
  });
});
