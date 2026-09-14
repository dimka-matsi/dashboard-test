import type { OrgNode } from '@staff-pulse/contracts';

export type NodeId = string;

/** Индексированное дерево, построенное из плоского массива узлов. */
export interface OrgTree {
  nodes: ReadonlyMap<NodeId, OrgNode>;
  /** Дети узла, отсортированные по имени (ru). Для листьев записи нет. */
  children: ReadonlyMap<NodeId, readonly NodeId[]>;
  /** Корни (parentId === null), отсортированы по имени. */
  roots: readonly NodeId[];
  /** Уровень узла: 1 — дивизион, 2 — отдел, 3 — команда. */
  depth: ReadonlyMap<NodeId, number>;
  /** Обход в глубину (pre-order): естественный порядок таблицы. */
  order: readonly NodeId[];
  maxDepth: number;
}
