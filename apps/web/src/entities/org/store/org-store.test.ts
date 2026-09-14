import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { makeOrgFixture } from '@/test/fixtures';

import { orgTreeQueryKey, type OrgSnapshot } from '../api/org-tree-query';
import { OrgModelStore } from './org-store';

const AT = '2026-09-14T12:00:00.000Z';

function setup(version: number | null = 5) {
  const queryClient = new QueryClient();
  const key = orgTreeQueryKey(null);
  const store = new OrgModelStore(queryClient, key, () => 1_000);
  queryClient.setQueryData<OrgSnapshot>(key, { nodes: makeOrgFixture(), version, serverId: 'srv' });
  const snapshot = queryClient.getQueryData<OrgSnapshot>(key)!;
  return { queryClient, key, store, snapshot };
}

describe('OrgModelStore', () => {
  it('до снимка патчи не применяются', () => {
    const { store } = setup();
    expect(store.applyPatch({ type: 'patch', seq: 6, changes: [] })).toBe('no-snapshot');
    expect(store.cursor()).toBeNull();
  });

  it('modelFor кэширует модель по ссылке снимка', () => {
    const { store, snapshot } = setup();
    const model = store.modelFor(snapshot);
    expect(store.modelFor(snapshot)).toBe(model);
    expect(store.modelFor({ ...snapshot })).not.toBe(model);
    expect(store.cursor()).toEqual({ serverId: 'srv', since: 5 });
  });

  it('applyPatch обновляет модель инкрементально и пишет снимок в кэш', () => {
    const { store, snapshot, queryClient, key } = setup();
    const model = store.modelFor(snapshot);

    const result = store.applyPatch({
      type: 'patch',
      seq: 6,
      changes: [{ id: 'team-a1-1', fields: { headcount: 12 }, updatedAt: AT }],
    });
    expect(result).toBe('applied');

    const stored = queryClient.getQueryData<OrgSnapshot>(key)!;
    expect(stored).not.toBe(snapshot);
    expect(stored.version).toBe(6);
    expect(stored.nodes.find((n) => n.id === 'team-a1-1')?.headcount).toBe(12);
    // незатронутые узлы в кэше — те же объекты (structural sharing)
    expect(stored.nodes.find((n) => n.id === 'div-b')).toBe(
      snapshot.nodes.find((n) => n.id === 'div-b'),
    );

    const next = store.modelFor(stored);
    expect(next).not.toBe(model);
    expect(next.aggregates.get('div-a')?.totalHeadcount).toBe(33);
    expect(next.aggregates.get('div-b')).toBe(model.aggregates.get('div-b'));
    expect(store.cursor()).toEqual({ serverId: 'srv', since: 6 });
    expect(store.flashes.get('team-a1-1')?.get('headcount')).toBe(1_000);
    expect(store.flashes.get('div-a')?.get('totalHeadcount')).toBe(1_000);
  });

  it('устаревший патч и разрыв нумерации распознаются по версии снимка', () => {
    const { store, snapshot } = setup();
    store.modelFor(snapshot);
    expect(store.applyPatch({ type: 'patch', seq: 5, changes: [] })).toBe('stale');
    expect(store.applyPatch({ type: 'patch', seq: 4, changes: [] })).toBe('stale');
    expect(store.applyPatch({ type: 'patch', seq: 8, changes: [] })).toBe('gap');
  });

  it('без версии снимка патчи применяются без проверки нумерации', () => {
    const { store, snapshot } = setup(null);
    store.modelFor(snapshot);
    expect(
      store.applyPatch({
        type: 'patch',
        seq: 42,
        changes: [{ id: 'div-b', fields: { performance: 10 }, updatedAt: AT }],
      }),
    ).toBe('applied');
  });

  it('refetch с тем же состоянием не меняет ссылку снимка и модель не пересобирается', () => {
    const { store, snapshot, queryClient, key } = setup();
    store.modelFor(snapshot);
    store.applyPatch({
      type: 'patch',
      seq: 6,
      changes: [{ id: 'team-a1-1', fields: { headcount: 12 }, updatedAt: AT }],
    });
    const stored = queryClient.getQueryData<OrgSnapshot>(key)!;
    const model = store.modelFor(stored);

    // «ответ сервера»: структурно тот же снимок, но новые объекты
    queryClient.setQueryData<OrgSnapshot>(key, JSON.parse(JSON.stringify(stored)) as OrgSnapshot);
    const afterRefetch = queryClient.getQueryData<OrgSnapshot>(key)!;
    expect(afterRefetch).toBe(stored);
    expect(store.modelFor(afterRefetch)).toBe(model);
  });
});
