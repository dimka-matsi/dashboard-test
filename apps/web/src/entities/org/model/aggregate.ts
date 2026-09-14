import type { NodeId, OrgTree } from './types';

/** Агрегированные показатели узла: собственные значения плюс значения всех потомков. */
export interface NodeAggregate {
  readonly id: NodeId;
  readonly totalHeadcount: number;
  readonly totalBudget: number;
  /** Σ performance·headcount по узлу и потомкам — числитель взвешенного среднего. */
  readonly weightedPerformanceSum: number;
  /** Средняя эффективность, взвешенная по headcount; null, если сотрудников нет. */
  readonly avgPerformance: number | null;
}

export type AggregateMap = ReadonlyMap<NodeId, NodeAggregate>;

/**
 * Агрегат одного узла из его собственных метрик и уже посчитанных агрегатов детей.
 * Используется и полным пересчётом, и инкрементальным (по цепочке предков).
 */
export function aggregateNode(tree: OrgTree, aggregates: AggregateMap, id: NodeId): NodeAggregate {
  const node = tree.nodes.get(id);
  if (!node) throw new Error(`Узел «${id}» не найден`);

  let totalHeadcount = node.headcount;
  let totalBudget = node.budget;
  let weightedPerformanceSum = node.performance * node.headcount;

  for (const childId of tree.children.get(id) ?? []) {
    const child = aggregates.get(childId);
    if (!child) throw new Error(`Агрегат потомка «${childId}» ещё не посчитан`);
    totalHeadcount += child.totalHeadcount;
    totalBudget += child.totalBudget;
    weightedPerformanceSum += child.weightedPerformanceSum;
  }

  return {
    id,
    totalHeadcount,
    totalBudget,
    weightedPerformanceSum,
    avgPerformance: totalHeadcount > 0 ? weightedPerformanceSum / totalHeadcount : null,
  };
}

/**
 * Полный пересчёт за O(n). Обход pre-order в обратном порядке гарантирует,
 * что агрегаты детей посчитаны раньше родителя.
 */
export function computeAggregates(tree: OrgTree): Map<NodeId, NodeAggregate> {
  const result = new Map<NodeId, NodeAggregate>();
  for (let i = tree.order.length - 1; i >= 0; i -= 1) {
    const id = tree.order[i] as NodeId;
    result.set(id, aggregateNode(tree, result, id));
  }
  return result;
}
