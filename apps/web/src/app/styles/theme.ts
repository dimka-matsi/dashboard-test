export const theme = {
  colors: {
    bg: '#f3f5f8',
    surface: '#ffffff',
    surfaceMuted: '#f8f9fb',
    surfaceHover: '#f1f4f9',
    border: '#dde2e8',
    text: '#1a1f27',
    textMuted: '#5d6875',
    accent: '#2b64d9',
    accentSoft: '#e7eefc',
    accentText: '#1f4fb3',
    danger: '#c9322b',
    dangerSoft: '#fdecea',
    warningSoft: '#fff5d6',
    focus: '#7fa8ff',
    flash: '#fff1a3',
    performance: {
      low: '#d6453d',
      medium: '#e0a010',
      high: '#1f9d55',
    },
    connection: {
      online: '#1f9d55',
      connecting: '#e0a010',
      offline: '#d6453d',
    },
  },
  space: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px' },
  radius: { sm: '4px', md: '8px', lg: '12px', pill: '999px' },
  font: {
    family:
      "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    size: { xs: '11px', sm: '12px', md: '14px', lg: '16px', xl: '20px', xxl: '24px' },
  },
  motion: { fast: '120ms', base: '200ms', flash: '1500ms' },
  layout: { splitMinWidth: 1280, headerHeight: '56px', maxWidth: '1680px' },
  shadow: { sm: '0 1px 2px rgba(16, 24, 40, 0.06)', md: '0 4px 14px rgba(16, 24, 40, 0.08)' },
} as const;

export type AppTheme = typeof theme;
