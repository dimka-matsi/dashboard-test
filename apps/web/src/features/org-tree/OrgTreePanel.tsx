import { useEffect } from 'react';
import styled from 'styled-components';

import { ancestorsOf } from '@/entities/org/model/build-org-tree';
import type { NodeId, OrgTree } from '@/entities/org/model/types';
import type { FlashMap } from '@/entities/org/store/org-store';
import { Button } from '@/shared/ui/Button';
import { Panel, PanelBody, PanelHeader, PanelMeta, PanelTitle } from '@/shared/ui/Panel';

import { TreeView } from './TreeView';
import { useExpandedNodes } from './use-expanded-nodes';

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.xs};
`;

export interface OrgTreePanelProps {
  tree: OrgTree;
  flashes: FlashMap;
  selectedId: NodeId | null;
  /** Узлы, попавшие под текущий поиск; null — поиск не активен. */
  matches: ReadonlySet<NodeId> | null;
  onSelect: (id: NodeId) => void;
  hidden?: boolean;
}

export function OrgTreePanel({
  tree,
  flashes,
  selectedId,
  matches,
  onSelect,
  hidden,
}: OrgTreePanelProps) {
  const { expanded, toggle, expandMany, expandAll, collapseAll } = useExpandedNodes(tree);

  // Выбранный узел (например, из таблицы) должен быть виден: раскрываем всех его предков.
  useEffect(() => {
    if (selectedId) expandMany(ancestorsOf(tree, selectedId));
  }, [selectedId, tree, expandMany]);

  // Найденные поиском узлы тоже раскрываются, чтобы подсветка была видна.
  useEffect(() => {
    if (!matches) return;
    const ancestors = new Set<NodeId>();
    for (const id of matches) for (const ancestor of ancestorsOf(tree, id)) ancestors.add(ancestor);
    expandMany(ancestors);
  }, [matches, tree, expandMany]);

  return (
    <Panel aria-label="Дерево подразделений" hidden={hidden}>
      <PanelHeader>
        <div>
          <PanelTitle>Дерево</PanelTitle>
          <PanelMeta>
            {matches
              ? `${matches.size} из ${tree.nodes.size} найдено`
              : `${tree.nodes.size} подразделений`}
          </PanelMeta>
        </div>
        <Actions>
          <Button type="button" $size="sm" $variant="ghost" onClick={expandAll}>
            Раскрыть все
          </Button>
          <Button type="button" $size="sm" $variant="ghost" onClick={collapseAll}>
            Свернуть все
          </Button>
        </Actions>
      </PanelHeader>
      <PanelBody>
        <TreeView
          tree={tree}
          expanded={expanded}
          selectedId={selectedId}
          flashes={flashes}
          matches={matches}
          onToggle={toggle}
          onSelect={onSelect}
        />
      </PanelBody>
    </Panel>
  );
}
