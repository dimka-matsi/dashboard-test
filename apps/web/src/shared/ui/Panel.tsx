import styled from 'styled-components';

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};

  /* display: flex перебивает UA-стиль [hidden]; возвращаем семантику атрибута */
  &[hidden] {
    display: none;
  }
`;

export const PanelHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: 600;
`;

export const PanelBody = styled.div<{ $flush?: boolean }>`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: ${({ theme, $flush }) => ($flush ? 0 : theme.space.md)};
`;
