import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

const fade = keyframes`
  from {
    background-color: var(--flash-from);
  }

  to {
    background-color: transparent;
  }
`;

const FlashSpan = styled.span`
  display: inline-block;
  margin: -2px -6px;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radius.sm};
  --flash-from: ${({ theme }) => theme.colors.flash};
  animation: ${fade} ${({ theme }) => theme.motion.flash} ease-out forwards;
`;

export interface FlashProps {
  /** Отметка времени изменения. Новое значение перезапускает анимацию; undefined — без подсветки. */
  at: number | undefined;
  children: ReactNode;
}

/**
 * Подсветка изменённого значения с затуханием ~1,5 с. Анимация целиком на CSS:
 * смена `key` пересоздаёт элемент, поэтому таймеры и состояние не нужны.
 * При prefers-reduced-motion глобальный стиль сводит анимацию к мгновенной.
 */
export function Flash({ at, children }: FlashProps) {
  if (at === undefined) return <>{children}</>;
  return (
    <FlashSpan key={at} data-flash-at={at}>
      {children}
    </FlashSpan>
  );
}
