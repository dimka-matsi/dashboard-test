import styled from 'styled-components';

import type { NodeId, OrgTree } from '@/entities/org/model/types';
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
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
}

export function OrgTreePanel({ tree, selectedId, onSelect }: OrgTreePanelProps) {
  const { expanded, toggle, expandAll, collapseAll } = useExpandedNodes(tree);

  return (
    <Panel aria-label="Дерево подразделений">
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
          onToggle={toggle}
          onSelect={onSelect}
        />
      </PanelBody>
    </Panel>
  );
}
