import styled from 'styled-components';

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.xl};
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
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.md};
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: 650;
  letter-spacing: -0.01em;
`;

export const PanelMeta = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  margin-left: ${({ theme }) => theme.space.sm};
`;

export const PanelBody = styled.div<{ $flush?: boolean }>`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: ${({ theme, $flush }) => ($flush ? 0 : theme.space.md)};
`;
