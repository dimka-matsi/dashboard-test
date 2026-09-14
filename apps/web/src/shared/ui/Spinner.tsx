import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export const Spinner = styled.span<{ $size?: number }>`
  display: inline-block;
  width: ${({ $size = 20 }) => `${$size}px`};
  height: ${({ $size = 20 }) => `${$size}px`};
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.accent};
  animation: ${spin} 0.8s linear infinite;
`;
