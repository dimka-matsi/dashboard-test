import { memo } from 'react';
import styled from 'styled-components';

import type { NodeId, OrgTree } from '@/entities/org/model/types';

import { PerformanceIndicator } from './PerformanceIndicator';

export interface TreeViewProps {
  tree: OrgTree;
  expanded: ReadonlySet<NodeId>;
  selectedId: NodeId | null;
  onToggle: (id: NodeId) => void;
  onSelect: (id: NodeId) => void;
}

const EMPTY: readonly NodeId[] = [];

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Group = styled(List)`
  padding-left: 22px;
`;

const Item = styled.li`
  margin: 0;
`;

const Row = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  min-height: 34px;
  padding: 4px ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  background: ${({ theme, $selected }) => ($selected ? theme.colors.accentSoft : 'transparent')};
  box-shadow: ${({ theme, $selected }) =>
    $selected ? `inset 3px 0 0 ${theme.colors.accent}` : 'none'};
  transition: background-color ${({ theme }) => theme.motion.fast} ease;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.accentSoft : theme.colors.surfaceHover};
  }
`;

const Toggle = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};

  &:hover {
    background: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
  }

  svg {
    transition: transform ${({ theme }) => theme.motion.base} ease;
    transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  }
`;

const ToggleSpacer = styled.span`
  display: inline-block;
  width: 24px;
  flex: none;
`;

const Name = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

const Headcount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.textMuted};
`;

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="5" r="3" fill="currentColor" />
      <path d="M2.5 14a5.5 5.5 0 0 1 11 0Z" fill="currentColor" />
    </svg>
  );
}

interface TreeNodeItemProps {
  id: NodeId;
  tree: OrgTree;
  expanded: ReadonlySet<NodeId>;
  selectedId: NodeId | null;
  onToggle: (id: NodeId) => void;
  onSelect: (id: NodeId) => void;
}

const TreeNodeItem = memo(function TreeNodeItem({
  id,
  tree,
  expanded,
  selectedId,
  onToggle,
  onSelect,
}: TreeNodeItemProps) {
  const node = tree.nodes.get(id);
  if (!node) return null;

  const children = tree.children.get(id) ?? EMPTY;
  const hasChildren = children.length > 0;
  const isOpen = hasChildren && expanded.has(id);
  const isSelected = selectedId === id;
  const level = tree.depth.get(id) ?? 1;

  return (
    <Item
      role="treeitem"
      aria-level={level}
      aria-expanded={hasChildren ? isOpen : undefined}
      aria-selected={isSelected}
      data-node-id={id}
    >
      <Row $selected={isSelected} onClick={() => onSelect(id)}>
        {hasChildren ? (
          <Toggle
            type="button"
            $open={isOpen}
            aria-label={isOpen ? `Свернуть «${node.name}»` : `Развернуть «${node.name}»`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(id);
            }}
          >
            <Chevron />
          </Toggle>
        ) : (
          <ToggleSpacer aria-hidden="true" />
        )}
        <Name>{node.name}</Name>
        <Headcount title="Численность подразделения">
          <PeopleIcon />
          {node.headcount}
        </Headcount>
        <PerformanceIndicator value={node.performance} />
      </Row>
      {hasChildren && isOpen && (
        <Group role="group">
          {children.map((childId) => (
            <TreeNodeItem
              key={childId}
              id={childId}
              tree={tree}
              expanded={expanded}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </Group>
      )}
    </Item>
  );
});

export function TreeView({ tree, expanded, selectedId, onToggle, onSelect }: TreeViewProps) {
  return (
    <List role="tree" aria-label="Орг-структура компании">
      {tree.roots.map((id) => (
        <TreeNodeItem
          key={id}
          id={id}
          tree={tree}
          expanded={expanded}
          selectedId={selectedId}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </List>
  );
}
