import type { SearchSource } from '@staff-pulse/contracts';
import styled from 'styled-components';

import { CloseIcon, SearchIcon, SparkleIcon } from '@/shared/ui/icons';
import { Spinner } from '@/shared/ui/Spinner';

const Wrap = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 680px;
  height: 44px;
  padding: 0 12px 0 14px;
  gap: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  transition:
    border-color ${({ theme }) => theme.motion.fast} ease,
    box-shadow ${({ theme }) => theme.motion.fast} ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.accentSoft};
  }
`;

const Icon = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.textFaint};
  flex: none;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  font-size: ${({ theme }) => theme.font.size.md};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textFaint};
  }

  &:focus {
    outline: none;
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 500;
  white-space: nowrap;

  &[data-source='llm'],
  &[data-source='rules'] {
    background: ${({ theme }) => theme.colors.accentSoft};
    border-color: transparent;
    color: ${({ theme }) => theme.colors.accentText};
  }
`;

const Clear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.textFaint};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const SOURCE_LABELS: Record<SearchSource, string> = {
  llm: 'AI-фильтр',
  rules: 'фильтр по правилам',
  none: 'текстовый поиск',
};

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  source: SearchSource | null;
  isParsing: boolean;
}

/**
 * Командная строка поиска: подстрока названия применяется сразу, а фраза на естественном языке
 * («отделы с эффективностью ниже 50») уходит на сервер и превращается в структурированный фильтр.
 * Источник интерпретации показан бейджем; если разобрать не удалось — остаётся текстовый поиск.
 */
export function SearchBox({ value, onChange, source, isParsing }: SearchBoxProps) {
  return (
    <Wrap>
      <Icon>
        <SearchIcon size={18} />
      </Icon>
      <Input
        type="search"
        value={value}
        placeholder="Найти или спросить: «отделы с эффективностью ниже 50»"
        aria-label="Поиск по названию или запрос на естественном языке"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      {isParsing && <Spinner $size={14} aria-label="Разбираем запрос" />}
      {!isParsing && source && (
        <Badge data-source={source} title="Как интерпретирован запрос">
          {source !== 'none' && <SparkleIcon size={12} />}
          {SOURCE_LABELS[source]}
        </Badge>
      )}
      {!isParsing && !source && value === '' && (
        <Badge title="Понимает запросы на естественном языке">
          <SparkleIcon size={12} />
          AI
        </Badge>
      )}
      {value !== '' && (
        <Clear type="button" aria-label="Очистить" onClick={() => onChange('')}>
          <CloseIcon size={14} />
        </Clear>
      )}
    </Wrap>
  );
}
