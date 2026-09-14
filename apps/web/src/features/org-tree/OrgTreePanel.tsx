import { useEffect } from 'react';
import styled from 'styled-components';

import { ancestorsOf } from '@/entities/org/model/build-org-tree';
import type { NodeId, OrgTree } from '@/entities/org/model/types';
import type { FlashMap } from '@/entities/org/store/org-store';
import { Button } from '@/shared/ui/Button';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/shared/ui/Panel';

import { TreeView } from './TreeView';
import { useExpandedNodes } from './use-expanded-nodes';

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.xs};
`;

const Meta = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  margin-left: ${({ theme }) => theme.space.sm};
`;

export interface OrgTreePanelProps {
  tree: OrgTree;
  flashes: FlashMap;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
  hidden?: boolean;
}

export function OrgTreePanel({ tree, flashes, selectedId, onSelect, hidden }: OrgTreePanelProps) {
  const { expanded, toggle, expandMany, expandAll, collapseAll } = useExpandedNodes(tree);

  // Выбранный узел (например, из таблицы) должен быть виден: раскрываем всех его предков.
  useEffect(() => {
    if (selectedId) expandMany(ancestorsOf(tree, selectedId));
  }, [selectedId, tree, expandMany]);

  return (
    <Panel aria-label="Дерево подразделений" hidden={hidden}>
      <PanelHeader>
        <div>
          <PanelTitle>Дерево</PanelTitle>
          <Meta>{tree.nodes.size} подразделений</Meta>
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
          onToggle={toggle}
          onSelect={onSelect}
        />
      </PanelBody>
    </Panel>
  );
}
