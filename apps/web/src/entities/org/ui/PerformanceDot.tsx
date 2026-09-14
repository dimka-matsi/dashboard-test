import styled from 'styled-components';

/*
 * Цвет задаётся через data-атрибут, а не через проп в CSS-функции:
 * три бакета → три класса, вместо класса на каждое из 101 значения.
 */
export const PerformanceDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
  background: ${({ theme }) => theme.colors.border};

  &[data-bucket='low'] {
    background: ${({ theme }) => theme.colors.performance.low};
  }

  &[data-bucket='medium'] {
    background: ${({ theme }) => theme.colors.performance.medium};
  }

  &[data-bucket='high'] {
    background: ${({ theme }) => theme.colors.performance.high};
  }
`;
