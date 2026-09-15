import styled, { css } from 'styled-components';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export const Button = styled.button<{ $variant?: ButtonVariant; $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: ${({ $size, theme }) =>
    $size === 'sm' ? `6px ${theme.space.md}` : `${theme.space.sm} ${theme.space.lg}`};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid transparent;
  font-size: ${({ $size, theme }) => ($size === 'sm' ? theme.font.size.sm : theme.font.size.md)};
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  transition:
    background-color ${({ theme }) => theme.motion.fast} ease,
    border-color ${({ theme }) => theme.motion.fast} ease,
    color ${({ theme }) => theme.motion.fast} ease;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  ${({ $variant = 'secondary', theme }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.colors.accent};
          color: ${theme.colors.onAccent};

          &:hover:not(:disabled) {
            background: ${theme.colors.accentText};
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${theme.colors.textMuted};

          &:hover:not(:disabled) {
            background: ${theme.colors.surfaceHover};
            color: ${theme.colors.text};
          }
        `;
      default:
        return css`
          background: ${theme.colors.surface};
          border-color: ${theme.colors.borderStrong};
          color: ${theme.colors.text};

          &:hover:not(:disabled) {
            background: ${theme.colors.surfaceHover};
          }
        `;
    }
  }}
`;
