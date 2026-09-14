import styled, { css } from 'styled-components';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export const Button = styled.button<{ $variant?: ButtonVariant; $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ $size, theme }) =>
    $size === 'sm' ? `${theme.space.xs} ${theme.space.sm}` : `${theme.space.sm} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid transparent;
  font-size: ${({ $size, theme }) => ($size === 'sm' ? theme.font.size.sm : theme.font.size.md)};
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  transition:
    background-color ${({ theme }) => theme.motion.fast} ease,
    border-color ${({ theme }) => theme.motion.fast} ease;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  ${({ $variant = 'secondary', theme }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.colors.accent};
          color: #fff;

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
          border-color: ${theme.colors.border};
          color: ${theme.colors.text};

          &:hover:not(:disabled) {
            background: ${theme.colors.surfaceHover};
          }
        `;
    }
  }}
`;
