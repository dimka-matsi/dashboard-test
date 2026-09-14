import type { NodeChange, OrgNode } from '@staff-pulse/contracts';

import { aggregateNode, type NodeAggregate } from './aggregate';
import type { OrgModel } from './org-model';
import type { NodeId } from './types';

/** Поля, значение которых в UI может «вспыхнуть» после патча. */
export type ChangedField =
  'headcount' | 'budget' | 'performance' | 'totalHeadcount' | 'totalBudget' | 'avgPerformance';

export type ChangedCells = ReadonlyMap<NodeId, ReadonlySet<ChangedField>>;

export interface ApplyResult {
  /** Новая модель; та же ссылка, если ни одно значение не изменилось. */
  readonly model: OrgModel;
  /** Какие ячейки реально изменились — по узлам и их предкам. */
  readonly changed: ChangedCells;
  /** Идентификаторы из патча, которых нет в модели (структурные изменения патчем не поддерживаются). */
  readonly unknownIds: readonly NodeId[];
}

const EMPTY_CHANGED: ChangedCells = new Map();

function mark(changed: Map<NodeId, Set<ChangedField>>, id: NodeId, field: ChangedField): void {
  const set = changed.get(id);
  if (set) set.add(field);
  else changed.set(id, new Set([field]));
}

/**
 * Применяет патч к модели без полного пересчёта.
 *
 * 1. Узлы из патча заменяются новыми объектами (только если значение реально отличается).
 * 2. Агрегаты пересчитываются только у затронутых узлов и их предков — снизу вверх,
 *    за O(k · глубина · ветвление) для k изменённых узлов. Остальные записи сохраняют ссылки,
 *    поэтому мемоизированные строки/узлы UI не перерисовываются.
 * 3. Структура (children, depth, order) не меняется: патч содержит только метрики.
 */
export function applyNodeChanges(model: OrgModel, changes: readonly NodeChange[]): ApplyResult {
  const { tree } = model;
  const nodes = new Map(tree.nodes);
  const changed = new Map<NodeId, Set<ChangedField>>();
  const unknownIds: NodeId[] = [];
  const touched: NodeId[] = [];

  for (const change of changes) {
    const current = nodes.get(change.id);
    if (!current) {
      unknownIds.push(change.id);
      continue;
    }
    let next: OrgNode | null = null;
    for (const field of ['headcount', 'budget', 'performance'] as const) {
      const value = change.fields[field];
      if (value === undefined || value === current[field]) continue;
      next ??= { ...current, updatedAt: change.updatedAt };
      next[field] = value;
      mark(changed, change.id, field);
    }
    if (next) {
      nodes.set(change.id, next);
      touched.push(change.id);
    }
  }

  if (touched.length === 0) return { model, changed: EMPTY_CHANGED, unknownIds };

  const nextTree = { ...tree, nodes };

  // Затронутые узлы и все их предки, глубокие раньше — чтобы дети были пересчитаны до родителя.
  const affected = new Set<NodeId>();
  for (const id of touched) {
    let current: NodeId | null = id;
    while (current !== null && !affected.has(current)) {
      affected.add(current);
      current = nodes.get(current)?.parentId ?? null;
    }
  }
  const ordered = [...affected].sort((a, b) => (tree.depth.get(b) ?? 0) - (tree.depth.get(a) ?? 0));

  const aggregates = new Map(model.aggregates);
  for (const id of ordered) {
    const previous = aggregates.get(id);
    const next = aggregateNode(nextTree, aggregates, id);
    if (previous && sameAggregate(previous, next)) continue;
    aggregates.set(id, next);
    if (!previous || previous.totalHeadcount !== next.totalHeadcount)
      mark(changed, id, 'totalHeadcount');
    if (!previous || previous.totalBudget !== next.totalBudget) mark(changed, id, 'totalBudget');
    if (!previous || previous.avgPerformance !== next.avgPerformance)
      mark(changed, id, 'avgPerformance');
  }

  return { model: { tree: nextTree, aggregates }, changed, unknownIds };
}

function sameAggregate(a: NodeAggregate, b: NodeAggregate): boolean {
  return (
    a.totalHeadcount === b.totalHeadcount &&
    a.totalBudget === b.totalBudget &&
    a.weightedPerformanceSum === b.weightedPerformanceSum
  );
}
