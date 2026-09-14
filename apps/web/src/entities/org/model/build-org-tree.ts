import type { OrgNode } from '@staff-pulse/contracts';

import type { NodeId, OrgTree } from './types';

export type OrgTreeErrorCode = 'duplicate-id' | 'missing-parent' | 'self-parent' | 'cycle';

/** Ответ прошёл схему, но структурно некорректен: такие данные показывать нельзя. */
export class OrgTreeError extends Error {
  readonly code: OrgTreeErrorCode;
  readonly nodeId: string | undefined;

  constructor(code: OrgTreeErrorCode, message: string, nodeId?: string) {
    super(message);
    this.name = 'OrgTreeError';
    this.code = code;
    this.nodeId = nodeId;
  }
}

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

/**
 * Строит индексированное дерево за O(n log n) (сортировка детей) с проверкой целостности:
 * дубли id, ссылки на несуществующего родителя, самоссылки и циклы — ошибка.
 */
export function buildOrgTree(flat: readonly OrgNode[]): OrgTree {
  const nodes = new Map<NodeId, OrgNode>();
  for (const node of flat) {
    if (nodes.has(node.id)) {
      throw new OrgTreeError(
        'duplicate-id',
        `Дублирующийся идентификатор узла «${node.id}»`,
        node.id,
      );
    }
    nodes.set(node.id, node);
  }

  const children = new Map<NodeId, NodeId[]>();
  const roots: NodeId[] = [];
  for (const node of flat) {
    if (node.parentId === null) {
      roots.push(node.id);
      continue;
    }
    if (node.parentId === node.id) {
      throw new OrgTreeError('self-parent', `Узел «${node.id}» ссылается сам на себя`, node.id);
    }
    if (!nodes.has(node.parentId)) {
      throw new OrgTreeError(
        'missing-parent',
        `Узел «${node.id}» ссылается на несуществующего родителя «${node.parentId}»`,
        node.id,
      );
    }
    const siblings = children.get(node.parentId);
    if (siblings) siblings.push(node.id);
    else children.set(node.parentId, [node.id]);
  }

  const byName = (a: NodeId, b: NodeId): number => {
    const nameA = nodes.get(a)?.name ?? '';
    const nameB = nodes.get(b)?.name ?? '';
    return collator.compare(nameA, nameB) || (a < b ? -1 : a > b ? 1 : 0);
  };
  roots.sort(byName);
  for (const list of children.values()) list.sort(byName);

  const depth = new Map<NodeId, number>();
  const order: NodeId[] = [];
  let maxDepth = 0;
  const stack: { id: NodeId; level: number }[] = [];
  for (let i = roots.length - 1; i >= 0; i -= 1) stack.push({ id: roots[i] as NodeId, level: 1 });

  while (stack.length > 0) {
    const current = stack.pop() as { id: NodeId; level: number };
    depth.set(current.id, current.level);
    order.push(current.id);
    if (current.level > maxDepth) maxDepth = current.level;
    const kids = children.get(current.id);
    if (!kids) continue;
    for (let i = kids.length - 1; i >= 0; i -= 1) {
      stack.push({ id: kids[i] as NodeId, level: current.level + 1 });
    }
  }

  if (order.length !== nodes.size) {
    const unreachable = [...nodes.keys()].find((id) => !depth.has(id));
    throw new OrgTreeError(
      'cycle',
      `В иерархии есть цикл: узел «${unreachable ?? '?'}» недостижим от корня`,
      unreachable,
    );
  }

  return { nodes, children, roots, depth, order, maxDepth };
}

/** Цепочка предков от родителя к корню. */
export function ancestorsOf(tree: OrgTree, id: NodeId): NodeId[] {
  const result: NodeId[] = [];
  let current = tree.nodes.get(id)?.parentId ?? null;
  while (current !== null) {
    result.push(current);
    current = tree.nodes.get(current)?.parentId ?? null;
  }
  return result;
}
