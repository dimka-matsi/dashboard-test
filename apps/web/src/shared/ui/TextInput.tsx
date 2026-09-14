import styled from 'styled-components';

const Wrap = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 220px;
`;

const Icon = styled.span`
  position: absolute;
  left: 10px;
  display: inline-flex;
  color: ${({ theme }) => theme.colors.textMuted};
  pointer-events: none;
`;

const Input = styled.input`
  width: 100%;
  padding: 7px 30px 7px 32px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.font.size.md};
  transition: border-color ${({ theme }) => theme.motion.fast} ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.accentSoft};
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`;

const Clear = styled.button`
  position: absolute;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
  }
`;

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}

export function SearchInput({ value, onChange, placeholder, label }: SearchInputProps) {
  return (
    <Wrap>
      <Icon aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" focusable="false">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M10.5 10.5 14 14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </Icon>
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== '' && (
        <Clear type="button" aria-label="Очистить" onClick={() => onChange('')}>
          ×
        </Clear>
      )}
    </Wrap>
  );
}
