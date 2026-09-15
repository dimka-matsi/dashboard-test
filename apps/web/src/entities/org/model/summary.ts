import type { OrgModel } from './org-model';
import type { NodeId } from './types';

export interface DivisionSummary {
  id: NodeId;
  name: string;
  totalHeadcount: number;
  totalBudget: number;
  avgPerformance: number | null;
}

/** Показатели всей компании: сумма по корням дерева. */
export interface OrgSummary {
  totalHeadcount: number;
  totalBudget: number;
  /** Средняя эффективность компании, взвешенная по численности; null без сотрудников. */
  avgPerformance: number | null;
  /** Количество узлов по уровням (1 — дивизионы, 2 — отделы, 3 — команды). */
  countsByLevel: ReadonlyMap<number, number>;
  /** Корневые подразделения в порядке дерева — для графика. */
  divisions: readonly DivisionSummary[];
}

export function summarize(model: OrgModel): OrgSummary {
  const { tree, aggregates } = model;
  let totalHeadcount = 0;
  let totalBudget = 0;
  let weightedSum = 0;
  const divisions: DivisionSummary[] = [];

  for (const id of tree.roots) {
    const aggregate = aggregates.get(id);
    const node = tree.nodes.get(id);
    if (!aggregate || !node) continue;
    totalHeadcount += aggregate.totalHeadcount;
    totalBudget += aggregate.totalBudget;
    weightedSum += aggregate.weightedPerformanceSum;
    divisions.push({
      id,
      name: node.name,
      totalHeadcount: aggregate.totalHeadcount,
      totalBudget: aggregate.totalBudget,
      avgPerformance: aggregate.avgPerformance,
    });
  }

  const countsByLevel = new Map<number, number>();
  for (const depth of tree.depth.values())
    countsByLevel.set(depth, (countsByLevel.get(depth) ?? 0) + 1);

  return {
    totalHeadcount,
    totalBudget,
    avgPerformance: totalHeadcount > 0 ? weightedSum / totalHeadcount : null,
    countsByLevel,
    divisions,
  };
}
