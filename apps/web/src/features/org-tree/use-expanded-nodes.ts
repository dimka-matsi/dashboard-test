import { useCallback, useMemo, useState } from 'react';

import type { NodeId, OrgTree } from '@/entities/org/model/types';

import { DEFAULT_EXPANDED_DEPTH } from './constants';

export interface ExpandedNodes {
  expanded: ReadonlySet<NodeId>;
  toggle: (id: NodeId) => void;
  expandMany: (ids: Iterable<NodeId>) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

export function initialExpanded(tree: OrgTree, depthLimit = DEFAULT_EXPANDED_DEPTH): Set<NodeId> {
  const result = new Set<NodeId>();
  for (const [id, depth] of tree.depth) {
    if (depth < depthLimit && tree.children.has(id)) result.add(id);
  }
  return result;
}

export function useExpandedNodes(tree: OrgTree): ExpandedNodes {
  const [expanded, setExpanded] = useState<ReadonlySet<NodeId>>(() => initialExpanded(tree));

  const toggle = useCallback((id: NodeId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandMany = useCallback((ids: Iterable<NodeId>) => {
    setExpanded((prev) => {
      let next: Set<NodeId> | null = null;
      for (const id of ids) {
        if (prev.has(id)) continue;
        next ??= new Set(prev);
        next.add(id);
      }
      return next ?? prev;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(tree.children.keys()));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  return useMemo(
    () => ({ expanded, toggle, expandMany, expandAll, collapseAll }),
    [expanded, toggle, expandMany, expandAll, collapseAll],
  );
}
