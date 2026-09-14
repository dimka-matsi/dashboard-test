import styled from 'styled-components';

import type { ViewMode } from './use-view-mode';

const Group = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Option = styled.button`
  padding: 5px 14px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: 500;
  transition:
    background-color ${({ theme }) => theme.motion.fast} ease,
    color ${({ theme }) => theme.motion.fast} ease;

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }
`;

export interface ViewSwitcherProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewSwitcher({ mode, onChange }: ViewSwitcherProps) {
  return (
    <Group role="group" aria-label="Режим просмотра">
      <Option type="button" aria-pressed={mode === 'tree'} onClick={() => onChange('tree')}>
        Дерево
      </Option>
      <Option type="button" aria-pressed={mode === 'table'} onClick={() => onChange('table')}>
        Таблица
      </Option>
    </Group>
  );
}
