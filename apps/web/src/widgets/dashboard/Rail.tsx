import styled from 'styled-components';

import { useThemeMode } from '@/app/providers/ThemeModeProvider';
import type { ViewMode } from '@/features/view-mode/use-view-mode';
import {
  BoltIcon,
  FlaskIcon,
  MoonIcon,
  PulseIcon,
  SplitIcon,
  SunIcon,
  TableIcon,
  TreeIcon,
} from '@/shared/ui/icons';

const Bar = styled.nav`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: ${({ theme }) => theme.layout.railWidth}px;
  padding: 14px 8px;
  gap: 6px;
  background: ${({ theme }) => theme.colors.rail};
  color: ${({ theme }) => theme.colors.railText};
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: 2px;

  & + & {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
  }
`;

const RailButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 8px 2px 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: ${({ theme }) => theme.colors.railText};
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0.01em;
  transition:
    background-color ${({ theme }) => theme.motion.fast} ease,
    color ${({ theme }) => theme.motion.fast} ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.colors.railActive};
    color: #fff;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.85);
    outline-offset: 1px;
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

const Menu = styled.details`
  position: relative;
  width: 100%;

  summary {
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }
`;

const MenuPanel = styled.div`
  position: absolute;
  left: calc(100% + 8px);
  bottom: 0;
  z-index: 20;
  min-width: 240px;
  padding: 8px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.font.size.sm};

  p {
    margin: 4px 8px 8px;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: ${({ theme }) => theme.font.size.xs};
  }

  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    border-radius: ${({ theme }) => theme.radius.sm};
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }

  a[aria-current='true'] {
    background: ${({ theme }) => theme.colors.surfaceHover};
    font-weight: 600;
  }

  a[aria-current='true']::after {
    content: '✓';
    color: ${({ theme }) => theme.colors.accent};
    font-weight: 700;
  }

  code {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const SCENARIOS: { href: string; label: string; hint: string }[] = [
  { href: '/', label: 'Обычный режим', hint: 'live включён' },
  { href: '/?live=off', label: 'Без live-обновлений', hint: 'live=off' },
  { href: '/?scenario=slow', label: 'Медленный ответ', hint: 'scenario=slow' },
  { href: '/?scenario=empty', label: 'Пустой ответ', hint: 'scenario=empty' },
  { href: '/?scenario=error', label: 'Ошибка сервера', hint: 'scenario=error' },
  { href: '/?scenario=invalid', label: 'Невалидный ответ', hint: 'scenario=invalid' },
];

export interface RailProps {
  mode: ViewMode;
  isWide: boolean;
  onModeChange: (mode: ViewMode) => void;
  liveEnabled: boolean;
  onToggleLive: () => void;
}

/** Боковая навигация: режим просмотра, live, тема, демо-сценарии. */
export function Rail({ mode, isWide, onModeChange, liveEnabled, onToggleLive }: RailProps) {
  const theme = useThemeMode();
  const isDark = theme.mode === 'dark';
  const currentQuery = window.location.search.replace(/^\?/, '');

  return (
    <Bar aria-label="Панель управления">
      <Logo title="Staff Pulse">
        <PulseIcon size={22} />
      </Logo>

      <Group role="group" aria-label="Режим просмотра">
        <RailButton
          type="button"
          aria-pressed={mode === 'tree'}
          aria-label="Дерево"
          onClick={() => onModeChange('tree')}
        >
          <TreeIcon />
          Дерево
        </RailButton>
        <RailButton
          type="button"
          aria-pressed={mode === 'table'}
          aria-label="Таблица"
          onClick={() => onModeChange('table')}
        >
          <TableIcon />
          Таблица
        </RailButton>
        <RailButton
          type="button"
          aria-pressed={mode === 'split'}
          aria-label="Вместе"
          title={isWide ? 'Дерево и таблица рядом' : 'Доступно на экранах от 1280 px'}
          disabled={!isWide}
          onClick={() => onModeChange('split')}
        >
          <SplitIcon />
          Вместе
        </RailButton>
      </Group>

      <Group>
        <RailButton
          type="button"
          aria-pressed={liveEnabled}
          aria-label={liveEnabled ? 'Выключить live-обновления' : 'Включить live-обновления'}
          title="Live-обновления по WebSocket"
          onClick={onToggleLive}
        >
          <BoltIcon />
          Live
        </RailButton>
        <RailButton
          type="button"
          aria-pressed={isDark}
          aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
          title="Переключить тему"
          onClick={theme.toggle}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
          Тема
        </RailButton>
      </Group>

      <Spacer />

      <Group>
        <Menu>
          <RailButton
            as="summary"
            title="Демо-сценарии для проверки состояний"
            aria-label="Демо-сценарии"
          >
            <FlaskIcon />
            Демо
          </RailButton>
          <MenuPanel>
            <p>Состояния экрана без правки кода. Страница перезагрузится.</p>
            {SCENARIOS.map((item) => {
              const itemQuery = item.href.includes('?') ? item.href.split('?')[1] : '';
              const isActive = itemQuery === currentQuery;
              return (
                <a key={item.href} href={item.href} aria-current={isActive ? 'true' : undefined}>
                  <span>
                    {item.label} <code>{item.hint}</code>
                  </span>
                </a>
              );
            })}
          </MenuPanel>
        </Menu>
      </Group>
    </Bar>
  );
}
