import type { OrgNode } from '@staff-pulse/contracts';

import { computeAggregates, type AggregateMap } from './aggregate';
import { buildOrgTree } from './build-org-tree';
import type { OrgTree } from './types';

/** Доменная модель: индексированное дерево и агрегаты по каждому узлу. */
export interface OrgModel {
  readonly tree: OrgTree;
  readonly aggregates: AggregateMap;
}

/** Строится один раз на снимок данных; агрегаты считаются сразу и мемоизируются вместе с моделью. */
export function buildOrgModel(flat: readonly OrgNode[]): OrgModel {
  const tree = buildOrgTree(flat);
  return { tree, aggregates: computeAggregates(tree) };
}
